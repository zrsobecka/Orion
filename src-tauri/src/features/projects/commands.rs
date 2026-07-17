use std::path::Path;

use tauri::State;

use crate::{
    domain::{
        AddFeatureInput, AddProjectTaskInput, Project, ProjectFeature, ProjectTask,
        UpdateProjectInput,
    },
    infrastructure::{
        integrations::git::{self, GitSnapshot},
        persistence::database,
    },
};

use super::{Dashboard, ProjectSnapshot};

use database::AppState;

fn project_snapshot(
    project: Project,
    features: Vec<ProjectFeature>,
    tasks: Vec<ProjectTask>,
) -> ProjectSnapshot {
    let git = git::read_snapshot(&project.path).unwrap_or_else(GitSnapshot::unavailable);
    ProjectSnapshot {
        project,
        features,
        tasks,
        git,
    }
}

fn load_snapshot(state: &State<'_, AppState>, project_id: &str) -> Result<ProjectSnapshot, String> {
    let (project, features, tasks) = {
        let connection = state
            .connection
            .lock()
            .map_err(|_| "The Orion database is temporarily unavailable.".to_string())?;
        (
            database::get_project(&connection, project_id)?,
            database::list_features(&connection, project_id)?,
            database::list_project_tasks(&connection, project_id)?,
        )
    };
    Ok(project_snapshot(project, features, tasks))
}

#[tauri::command]
pub fn get_dashboard(state: State<'_, AppState>) -> Result<Dashboard, String> {
    let (projects, features, tasks, refreshed_at) = {
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
        let refreshed_at = database::current_timestamp(&connection)?;
        (projects, features, tasks, refreshed_at)
    };

    let projects = projects
        .into_iter()
        .zip(features)
        .zip(tasks)
        .map(|((project, features), tasks)| project_snapshot(project, features, tasks))
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
