use std::collections::HashSet;

use serde::Deserialize;
use serde_json::json;

use crate::{
    domain::{
        CommitAnalysis, CommitFeatureSuggestion, CommitTaskSuggestion, Project, ProjectFeature,
        ProjectFocus, ProjectTask,
    },
    infrastructure::integrations::{git, lm_studio},
};

pub const PROMPT_VERSION: &str = "commit-impact-v1";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawCommitAnalysis {
    what_changed: String,
    now_possible: String,
    caution: String,
    task_suggestion: Option<CommitTaskSuggestion>,
    feature_suggestion: Option<CommitFeatureSuggestion>,
    focus_impact: String,
    goal_impact: String,
}

pub fn analyze(
    path: &str,
    project: &Project,
    features: &[ProjectFeature],
    focuses: &[ProjectFocus],
    tasks: &[ProjectTask],
    commit_hash: &str,
    created_at: String,
) -> Result<CommitAnalysis, String> {
    let commit = git::read_snapshot(path)?
        .commits
        .into_iter()
        .find(|commit| commit.hash == commit_hash)
        .ok_or_else(|| "The commit is not among the recent repository commits.".to_string())?;
    let details = git::read_commit_details(path, commit_hash)?;
    let active_focus = focuses.iter().find(|focus| focus.status == "active");
    let context = build_context(project, features, active_focus, tasks, &commit, &details);
    let response = lm_studio::structured_chat(lm_studio::StructuredChatRequest {
        system_prompt: "You explain one Git commit in practical product language for the builder of the application. Use only supplied evidence. Treat every relationship and status as an uncertain proposal. Never claim that the whole application, focus, task, or feature is complete without direct evidence. Suggest at most one existing task and one existing feature by their exact supplied IDs. The feature status may stay the same. Keep warnings specific; use an empty string when there is no concrete caution. Return concise English text.",
        user_prompt: &context,
        schema_name: "orion_commit_impact",
        schema: analysis_schema(),
        reasoning_effort: Some("none"),
        max_tokens: 650,
    })?;
    let raw: RawCommitAnalysis = serde_json::from_str(&response.content).map_err(|_| {
        "LM Studio did not return valid commit-impact data. Try a model with structured-output support."
            .to_string()
    })?;
    let task_ids = tasks
        .iter()
        .map(|task| task.id.as_str())
        .collect::<HashSet<_>>();
    let feature_ids = features
        .iter()
        .map(|feature| feature.id.as_str())
        .collect::<HashSet<_>>();
    let task_suggestion = raw.task_suggestion.and_then(|suggestion| {
        task_ids
            .contains(suggestion.task_id.as_str())
            .then(|| CommitTaskSuggestion {
                task_id: suggestion.task_id,
                reason: limited(&suggestion.reason, 400),
            })
    });
    let feature_suggestion = raw.feature_suggestion.and_then(|suggestion| {
        (feature_ids.contains(suggestion.feature_id.as_str())
            && matches!(
                suggestion.status.as_str(),
                "planned" | "in_progress" | "working" | "blocked"
            ))
        .then(|| CommitFeatureSuggestion {
            feature_id: suggestion.feature_id,
            status: suggestion.status,
            reason: limited(&suggestion.reason, 400),
        })
    });
    Ok(CommitAnalysis {
        commit_hash: commit.hash,
        model: response.model,
        what_changed: limited(&raw.what_changed, 700),
        now_possible: limited(&raw.now_possible, 500),
        caution: limited(&raw.caution, 500),
        task_suggestion,
        feature_suggestion,
        focus_impact: limited(&raw.focus_impact, 500),
        goal_impact: limited(&raw.goal_impact, 500),
        review_status: "pending".to_string(),
        created_at,
        reviewed_at: None,
    })
}

fn limited(value: &str, max: usize) -> String {
    value.trim().chars().take(max).collect()
}

fn build_context(
    project: &Project,
    features: &[ProjectFeature],
    active_focus: Option<&ProjectFocus>,
    tasks: &[ProjectTask],
    commit: &git::GitCommit,
    details: &git::GitCommitDetails,
) -> String {
    let mut prompt = format!(
        "Project goal: {}\nActive focus: {}\nCommit: {} ({})\nAuthor: {}\nFiles: {}, additions: {}, deletions: {}\n\nExisting tasks:\n",
        project.goal.trim(),
        active_focus.map(|focus| focus.title.as_str()).unwrap_or("none"),
        commit.subject,
        commit.hash,
        commit.author,
        commit.changed_files,
        commit.additions,
        commit.deletions
    );
    if tasks.is_empty() {
        prompt.push_str("- none\n");
    } else {
        for task in tasks.iter().take(30) {
            prompt.push_str(&format!(
                "- id={} completed={} title={}\n",
                task.id, task.completed, task.title
            ));
        }
    }
    prompt.push_str("\nExisting features:\n");
    if features.is_empty() {
        prompt.push_str("- none\n");
    } else {
        for feature in features.iter().take(30) {
            prompt.push_str(&format!(
                "- id={} status={} name={} evidence={}\n",
                feature.id, feature.status, feature.name, feature.evidence
            ));
        }
    }
    prompt.push_str("\nChanged files:\n");
    for file in details.files.iter().take(80) {
        prompt.push_str(&format!(
            "- {} [{}] +{} -{}\n",
            file.path,
            file.status,
            file.additions
                .map(|value| value.to_string())
                .unwrap_or_else(|| "binary".to_string()),
            file.deletions
                .map(|value| value.to_string())
                .unwrap_or_else(|| "binary".to_string())
        ));
    }
    prompt.push_str("\nTechnical diff (may be truncated):\n");
    prompt.extend(details.diff.chars().take(18_000));
    prompt
}

fn analysis_schema() -> serde_json::Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "whatChanged": { "type": "string", "minLength": 1, "maxLength": 700 },
            "nowPossible": { "type": "string", "minLength": 1, "maxLength": 500 },
            "caution": { "type": "string", "maxLength": 500 },
            "taskSuggestion": {
                "anyOf": [
                    { "type": "null" },
                    {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                            "taskId": { "type": "string" },
                            "reason": { "type": "string", "maxLength": 400 }
                        },
                        "required": ["taskId", "reason"]
                    }
                ]
            },
            "featureSuggestion": {
                "anyOf": [
                    { "type": "null" },
                    {
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                            "featureId": { "type": "string" },
                            "status": {
                                "type": "string",
                                "enum": ["planned", "in_progress", "working", "blocked"]
                            },
                            "reason": { "type": "string", "maxLength": 400 }
                        },
                        "required": ["featureId", "status", "reason"]
                    }
                ]
            },
            "focusImpact": { "type": "string", "minLength": 1, "maxLength": 500 },
            "goalImpact": { "type": "string", "minLength": 1, "maxLength": 500 }
        },
        "required": [
            "whatChanged",
            "nowPossible",
            "caution",
            "taskSuggestion",
            "featureSuggestion",
            "focusImpact",
            "goalImpact"
        ]
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn limited_text_is_trimmed_and_bounded() {
        assert_eq!(limited("  abcdef  ", 3), "abc");
    }
}
