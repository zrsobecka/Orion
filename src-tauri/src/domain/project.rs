use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub goal: String,
    pub next_action: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFeature {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub evidence: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTask {
    pub id: String,
    pub project_id: String,
    pub focus_id: Option<String>,
    pub feature_id: Option<String>,
    pub title: String,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFocus {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub status: String,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub id: String,
    pub goal: String,
    pub next_action: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddFeatureInput {
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub evidence: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProjectTaskInput {
    pub project_id: String,
    pub feature_id: Option<String>,
    pub title: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProjectFocusInput {
    pub project_id: String,
    pub title: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectFocusInput {
    pub focus_id: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureSuggestion {
    pub name: String,
    pub description: String,
    pub suggested_status: String,
    pub evidence: String,
    pub confidence: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptFeatureSuggestionsInput {
    pub project_id: String,
    pub suggestions: Vec<FeatureSuggestion>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitTaskSuggestion {
    pub task_id: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitFeatureSuggestion {
    pub feature_id: String,
    pub status: String,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitAnalysis {
    pub commit_hash: String,
    pub model: String,
    pub what_changed: String,
    pub now_possible: String,
    pub caution: String,
    pub task_suggestion: Option<CommitTaskSuggestion>,
    pub feature_suggestion: Option<CommitFeatureSuggestion>,
    pub focus_impact: String,
    pub goal_impact: String,
    pub review_status: String,
    pub created_at: String,
    pub reviewed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCommitAnalysisInput {
    pub project_id: String,
    pub commit_hash: String,
    pub action: String,
    pub task_id: Option<String>,
    pub complete_task: bool,
    pub feature_id: Option<String>,
    pub feature_status: Option<String>,
}
