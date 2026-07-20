use std::path::Path;

use tauri::State;

use crate::{
    domain::{
        AcceptFeatureSuggestionsInput, AddFeatureInput, AddProjectTaskInput, CommitAnalysis,
        Project, ProjectFeature, ProjectFocus, ProjectTask, ReviewCommitAnalysisInput,
        StartProjectFocusInput, UpdateProjectInput,
    },
    infrastructure::{
        integrations::git::{self, GitSnapshot},
        persistence::database,
    },
};

use super::{
    commit_analysis, repository_analysis, Dashboard, FeatureAnalysisResult, ProjectSnapshot,
};

use database::AppState;

fn project_snapshot(
    project: Project,
    features: Vec<ProjectFeature>,
    focuses: Vec<ProjectFocus>,
    tasks: Vec<ProjectTask>,
) -> ProjectSnapshot {
    let git = git::read_snapshot(&project.path).unwrap_or_else(GitSnapshot::unavailable);
    ProjectSnapshot {
        project,
        features,
        focuses,
        tasks,
        git,
    }
}

#[tauri::command]
pub async fn get_commit_details(
    project_id: String,
    hash: String,
    state: State<'_, AppState>,
) -> Result<git::GitCommitDetails, String> {
    let path = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::get_project(&connection, &project_id)?.path
    };
    tauri::async_runtime::spawn_blocking(move || git::read_commit_details(&path, &hash))
        .await
        .map_err(|error| format!("Commit inspection stopped unexpectedly: {error}"))?
}

#[tauri::command]
pub async fn analyze_commit(
    project_id: String,
    hash: String,
    state: State<'_, AppState>,
) -> Result<CommitAnalysis, String> {
    if !(7..=64).contains(&hash.len())
        || !hash.chars().all(|character| character.is_ascii_hexdigit())
    {
        return Err("The commit hash is invalid.".to_string());
    }
    let (project, features, focuses, tasks, created_at) = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        if let Some(cached) = database::get_cached_commit_analysis(
            &connection,
            &project_id,
            &hash,
            commit_analysis::PROMPT_VERSION,
        )? {
            return Ok(cached);
        }
        (
            database::get_project(&connection, &project_id)?,
            database::list_features(&connection, &project_id)?,
            database::list_project_focuses(&connection, &project_id)?,
            database::list_project_tasks(&connection, &project_id)?,
            database::current_timestamp(&connection)?,
        )
    };
    let path = project.path.clone();
    let analysis = tauri::async_runtime::spawn_blocking(move || {
        commit_analysis::analyze(
            &path, &project, &features, &focuses, &tasks, &hash, created_at,
        )
    })
    .await
    .map_err(|error| format!("Commit analysis stopped unexpectedly: {error}"))??;
    let connection = state
        .connection
        .lock()
        .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
    database::save_commit_analysis(
        &connection,
        &project_id,
        commit_analysis::PROMPT_VERSION,
        &analysis,
    )
}

#[tauri::command]
pub fn review_commit_analysis(
    input: ReviewCommitAnalysisInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let mut connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::review_commit_analysis(&mut connection, &input, commit_analysis::PROMPT_VERSION)?
    };
    load_snapshot(&state, &project_id)
}

fn load_snapshot(state: &State<'_, AppState>, project_id: &str) -> Result<ProjectSnapshot, String> {
    let (project, features, focuses, tasks) = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        (
            database::get_project(&connection, project_id)?,
            database::list_features(&connection, project_id)?,
            database::list_project_focuses(&connection, project_id)?,
            database::list_project_tasks(&connection, project_id)?,
        )
    };
    Ok(project_snapshot(project, features, focuses, tasks))
}

#[tauri::command]
pub fn get_dashboard(state: State<'_, AppState>) -> Result<Dashboard, String> {
    let (projects, features, focuses, tasks, refreshed_at) = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        let projects = database::list_projects(&connection)?;
        let features = projects
            .iter()
            .map(|project| database::list_features(&connection, &project.id))
            .collect::<Result<Vec<_>, _>>()?;
        let tasks = projects
            .iter()
            .map(|project| database::list_project_tasks(&connection, &project.id))
            .collect::<Result<Vec<_>, _>>()?;
        let focuses = projects
            .iter()
            .map(|project| database::list_project_focuses(&connection, &project.id))
            .collect::<Result<Vec<_>, _>>()?;
        let refreshed_at = database::current_timestamp(&connection)?;
        (projects, features, focuses, tasks, refreshed_at)
    };

    let projects = projects
        .into_iter()
        .zip(features)
        .zip(focuses)
        .zip(tasks)
        .map(|(((project, features), focuses), tasks)| {
            project_snapshot(project, features, focuses, tasks)
        })
        .collect();
    Ok(Dashboard {
        projects,
        refreshed_at,
    })
}

#[tauri::command]
pub fn add_project(path: String, state: State<'_, AppState>) -> Result<ProjectSnapshot, String> {
    let root = git::resolve_repository_root(path.trim())?;
    let root_path = root.to_string_lossy().to_string();
    let name = Path::new(&root_path)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Could not determine a project name from this folder.".to_string())?;

    let project = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::add_project(&connection, name, &root_path)?
    };
    load_snapshot(&state, &project.id)
}

#[tauri::command]
pub fn update_project(
    input: UpdateProjectInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::update_project(&connection, &input)?.id
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn remove_project(project_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let connection = state
        .connection
        .lock()
        .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
    database::remove_project(&connection, &project_id)
}

#[tauri::command]
pub fn add_feature(
    input: AddFeatureInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::add_feature(&connection, &input)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub async fn analyze_project_features(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<FeatureAnalysisResult, String> {
    let (path, features) = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        let project = database::get_project(&connection, &project_id)?;
        let features = database::list_features(&connection, &project_id)?;
        (project.path, features)
    };
    tauri::async_runtime::spawn_blocking(move || repository_analysis::analyze(&path, &features))
        .await
        .map_err(|error| format!("The repository analysis stopped unexpectedly: {error}"))?
}

#[tauri::command]
pub fn accept_feature_suggestions(
    input: AcceptFeatureSuggestionsInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let mut connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::add_feature_suggestions(&mut connection, &input)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn update_feature_status(
    feature_id: String,
    status: String,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::update_feature_status(&connection, &feature_id, &status)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn add_project_task(
    input: AddProjectTaskInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::add_project_task(&connection, &input)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn start_project_focus(
    input: StartProjectFocusInput,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let mut connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::start_project_focus(&mut connection, &input)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn set_project_task_completed(
    task_id: String,
    completed: bool,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::set_project_task_completed(&connection, &task_id, completed)?
    };
    load_snapshot(&state, &project_id)
}

#[tauri::command]
pub fn remove_project_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<ProjectSnapshot, String> {
    let project_id = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        database::remove_project_task(&connection, &task_id)?
    };
    load_snapshot(&state, &project_id)
}
