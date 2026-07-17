use serde::Serialize;

use crate::{
    domain::{Project, ProjectFeature, ProjectTask},
    infrastructure::integrations::git::GitSnapshot,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSnapshot {
    pub project: Project,
    pub features: Vec<ProjectFeature>,
    pub tasks: Vec<ProjectTask>,
    pub git: GitSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub projects: Vec<ProjectSnapshot>,
    pub refreshed_at: String,
}
