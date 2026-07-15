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
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub subject: String,
    pub authored_at: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranch {
    pub name: String,
    pub short_hash: String,
    pub updated_at: String,
    pub is_current: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitSnapshot {
    pub available: bool,
    pub error: Option<String>,
    pub current_branch: String,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub modified_files: usize,
    pub is_dirty: bool,
    pub branches: Vec<GitBranch>,
    pub commits: Vec<GitCommit>,
}

impl GitSnapshot {
    pub fn unavailable(error: String) -> Self {
        Self {
            available: false,
            error: Some(error),
            current_branch: String::new(),
            upstream: None,
            ahead: 0,
            behind: 0,
            modified_files: 0,
            is_dirty: false,
            branches: Vec::new(),
            commits: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSnapshot {
    pub project: Project,
    pub features: Vec<ProjectFeature>,
    pub git: GitSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub projects: Vec<ProjectSnapshot>,
    pub refreshed_at: String,
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
