use serde::Serialize;

use crate::{
    domain::{FeatureSuggestion, Project, ProjectFeature, ProjectFocus, ProjectTask},
    infrastructure::integrations::git::GitSnapshot,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSnapshot {
    pub project: Project,
    pub features: Vec<ProjectFeature>,
    pub focuses: Vec<ProjectFocus>,
    pub tasks: Vec<ProjectTask>,
    pub git: GitSnapshot,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub projects: Vec<ProjectSnapshot>,
    pub refreshed_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureAnalysisResult {
    pub model: String,
    pub scanned_files: usize,
    pub truncated: bool,
    pub suggestions: Vec<FeatureSuggestion>,
}
