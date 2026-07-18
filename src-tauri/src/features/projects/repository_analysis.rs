use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use crate::{
    domain::{FeatureSuggestion, ProjectFeature},
    infrastructure::integrations::lm_studio,
};
use serde::Deserialize;
use serde_json::json;

use super::FeatureAnalysisResult;
use crate::infrastructure::integrations::process::background_command;

// Keep local 12B models responsive while still sampling several high-signal
// product, test, and source files. Longer whole-product review belongs to the
// later overview-analysis flow rather than this feature bootstrap.
const MAX_CONTEXT_CHARS: usize = 700;
const MAX_FILE_CHARS: usize = 350;
const MAX_SCANNED_FILES: usize = 80;
const MAX_LISTED_FILES: usize = 15;
const MAX_REPOSITORY_PATH_CHARS: usize = 200;

struct RepositoryContext {
    prompt: String,
    included_paths: HashSet<String>,
    scanned_files: usize,
    truncated: bool,
}

#[derive(Debug, Deserialize)]
struct RawFeatureAnalysis {
    features: Vec<RawFeatureSuggestion>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawFeatureSuggestion {
    name: String,
    description: String,
    status: String,
    evidence_paths: Vec<String>,
    confidence: f64,
}

pub fn analyze(path: &str, existing: &[ProjectFeature]) -> Result<FeatureAnalysisResult, String> {
    let context = build_context(Path::new(path), existing)?;
    let response = lm_studio::structured_chat(lm_studio::StructuredChatRequest {
        system_prompt: "You map user-visible application capabilities from repository evidence. Return only capabilities supported by the supplied files. Do not invent behavior, implementation tasks, libraries, architecture layers, or generic quality attributes. Use concise English names and descriptions. Use working only when implementation or tests provide concrete evidence, in_progress for visibly partial implementation, and planned only for documented intent. Never infer product priority or blocked status. Every evidencePaths entry must exactly match a supplied repository path. Do not repeat an existing feature or return near-duplicates.",
        user_prompt: &context.prompt,
        schema_name: "orion_feature_analysis",
        schema: feature_analysis_schema(),
        reasoning_effort: Some("none"),
        max_tokens: 350,
    })?;
    let output: RawFeatureAnalysis = serde_json::from_str(&response.content).map_err(|_| {
        "LM Studio did not return valid feature data. Try a model with structured-output support."
            .to_string()
    })?;
    let existing_names = existing
        .iter()
        .map(|feature| feature.name.trim().to_lowercase())
        .collect::<HashSet<_>>();
    let mut seen = existing_names;
    let suggestions = output
        .features
        .into_iter()
        .filter_map(|raw| {
            let name = raw.name.trim();
            let normalized_name = name.to_lowercase();
            if name.is_empty()
                || name.chars().count() > 120
                || seen.contains(&normalized_name)
                || !matches!(raw.status.as_str(), "planned" | "in_progress" | "working")
                || !raw.confidence.is_finite()
                || !(0.0..=1.0).contains(&raw.confidence)
            {
                return None;
            }
            let evidence_paths = raw
                .evidence_paths
                .into_iter()
                .map(|path| path.replace('\\', "/"))
                .filter(|path| context.included_paths.contains(path))
                .take(4)
                .collect::<Vec<_>>();
            if evidence_paths.is_empty() {
                return None;
            }
            let description = raw.description.trim().chars().take(600).collect();
            let evidence = evidence_paths.join(", ").chars().take(600).collect();
            seen.insert(normalized_name);
            Some(FeatureSuggestion {
                name: name.to_string(),
                description,
                suggested_status: raw.status,
                evidence,
                confidence: raw.confidence,
            })
        })
        .collect();
    Ok(FeatureAnalysisResult {
        model: response.model,
        scanned_files: context.scanned_files,
        truncated: context.truncated,
        suggestions,
    })
}

fn feature_analysis_schema() -> serde_json::Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "features": {
                "type": "array",
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "name": { "type": "string", "minLength": 1, "maxLength": 120 },
                        "description": { "type": "string", "maxLength": 600 },
                        "status": {
                            "type": "string",
                            "enum": ["planned", "in_progress", "working"]
                        },
                        "evidencePaths": {
                            "type": "array",
                            "minItems": 1,
                            "maxItems": 4,
                            "items": { "type": "string" }
                        },
                        "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
                    },
                    "required": ["name", "description", "status", "evidencePaths", "confidence"]
                }
            }
        },
        "required": ["features"]
    })
}

fn build_context(root: &Path, existing: &[ProjectFeature]) -> Result<RepositoryContext, String> {
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("Could not resolve the repository before analysis: {error}"))?;
    let output = background_command("git")
        .arg("-C")
        .arg(&canonical_root)
        .args([
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
        ])
        .output()
        .map_err(|error| format!("Git could not list repository files: {error}"))?;
    if !output.status.success() {
        return Err("Git could not list files for repository analysis.".to_string());
    }
    let mut candidates = String::from_utf8_lossy(&output.stdout)
        .split('\0')
        .filter(|path| !path.is_empty() && is_safe_candidate(path))
        .map(str::to_string)
        .collect::<Vec<_>>();
    candidates.sort_by_key(|path| (candidate_rank(path), path.to_lowercase()));

    let mut prompt = String::from(
        "Identify missing user-visible application features from the repository evidence below.\n\n",
    );
    prompt.push_str("Existing Orion features (do not repeat these):\n");
    if existing.is_empty() {
        prompt.push_str("- none\n");
    } else {
        for feature in existing {
            prompt.push_str("- ");
            prompt.push_str(feature.name.trim());
            prompt.push('\n');
        }
    }
    prompt.push_str("\nRepository files:\n");
    for path in candidates.iter().take(MAX_LISTED_FILES) {
        prompt.push_str("- ");
        prompt.push_str(&path.replace('\\', "/"));
        prompt.push('\n');
    }
    prompt.push_str("\nSelected file contents:\n");

    let mut included_paths = HashSet::new();
    let mut scanned_files = 0;
    let mut content_chars = 0;
    let mut truncated = candidates.len() > MAX_LISTED_FILES;
    for relative in &candidates {
        if scanned_files >= MAX_SCANNED_FILES || content_chars >= MAX_CONTEXT_CHARS {
            truncated = true;
            break;
        }
        let joined = canonical_root.join(PathBuf::from(relative));
        let Ok(canonical_file) = joined.canonicalize() else {
            continue;
        };
        if !canonical_file.starts_with(&canonical_root) || !canonical_file.is_file() {
            continue;
        }
        let Ok(metadata) = fs::metadata(&canonical_file) else {
            continue;
        };
        if metadata.len() > 256_000 {
            truncated = true;
            continue;
        }
        let Ok(bytes) = fs::read(&canonical_file) else {
            continue;
        };
        let Ok(contents) = String::from_utf8(bytes) else {
            continue;
        };
        let normalized_path = relative.replace('\\', "/");
        let remaining = MAX_CONTEXT_CHARS.saturating_sub(content_chars);
        let limit = remaining.min(MAX_FILE_CHARS);
        if limit == 0 {
            truncated = true;
            break;
        }
        let excerpt = contents.chars().take(limit).collect::<String>();
        if excerpt.chars().count() < contents.chars().count() {
            truncated = true;
        }
        prompt.push_str("\n--- ");
        prompt.push_str(&normalized_path);
        prompt.push_str(" ---\n");
        prompt.push_str(&excerpt);
        prompt.push('\n');
        content_chars += excerpt.chars().count();
        scanned_files += 1;
        included_paths.insert(normalized_path);
    }
    if scanned_files == 0 {
        return Err("No safe text files were available for repository analysis.".to_string());
    }
    Ok(RepositoryContext {
        prompt,
        included_paths,
        scanned_files,
        truncated,
    })
}

fn candidate_rank(path: &str) -> u8 {
    let lower = path.to_lowercase().replace('\\', "/");
    if lower == "readme.md"
        || lower.starts_with("ai/features/")
        || lower.starts_with("ai/product/")
        || lower.ends_with("package.json")
        || lower.ends_with("cargo.toml")
        || lower.ends_with("pyproject.toml")
    {
        0
    } else if lower.contains("test") || lower.contains("spec") {
        1
    } else if lower.contains("/src/") || lower.starts_with("src/") {
        2
    } else {
        3
    }
}

fn is_safe_candidate(path: &str) -> bool {
    if path.chars().count() > MAX_REPOSITORY_PATH_CHARS {
        return false;
    }
    let normalized = path.to_lowercase().replace('\\', "/");
    let segments = normalized.split('/').collect::<Vec<_>>();
    if segments.iter().any(|segment| {
        matches!(
            *segment,
            ".git"
                | "node_modules"
                | "target"
                | "dist"
                | "build"
                | "coverage"
                | ".idea"
                | ".vscode"
                | "app"
        )
    }) {
        return false;
    }
    let file_name = segments.last().copied().unwrap_or_default();
    if file_name.starts_with(".env")
        || file_name.contains("secret")
        || file_name.contains("credential")
        || file_name.ends_with(".pem")
        || file_name.ends_with(".key")
        || file_name.ends_with(".pfx")
        || file_name.ends_with(".sqlite")
        || file_name.ends_with(".sqlite3")
        || file_name.ends_with(".db")
        || file_name.ends_with("lock")
    {
        return false;
    }
    let extension = Path::new(file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    matches!(
        extension,
        "rs" | "ts"
            | "tsx"
            | "js"
            | "jsx"
            | "py"
            | "md"
            | "toml"
            | "json"
            | "yaml"
            | "yml"
            | "html"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scanner_rejects_secrets_binaries_and_generated_directories() {
        assert!(!is_safe_candidate(".env.local"));
        assert!(!is_safe_candidate("config/client-secret.json"));
        assert!(!is_safe_candidate("src-tauri/target/release/app.rs"));
        assert!(!is_safe_candidate("data/orion.sqlite"));
        assert!(!is_safe_candidate("frontend/public/logo.png"));
        assert!(!is_safe_candidate(&format!("{}.md", "a".repeat(201))));
        assert!(is_safe_candidate("frontend/src/features/projects/App.tsx"));
        assert!(is_safe_candidate("ai/features/repository-analysis.md"));
    }

    #[test]
    fn product_docs_and_tests_are_scanned_before_general_source() {
        assert!(candidate_rank("README.md") < candidate_rank("frontend/src/App.tsx"));
        assert!(
            candidate_rank("frontend/src/App.test.tsx") < candidate_rank("frontend/src/App.tsx")
        );
    }
}
