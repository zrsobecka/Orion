use std::{fs, path::PathBuf, sync::Mutex};

use rusqlite::{params, Connection, OptionalExtension, Row};
use tauri::{AppHandle, Manager};

use crate::domain::{
    AddFeatureInput, AddProjectTaskInput, Project, ProjectFeature, ProjectTask, UpdateProjectInput,
};

pub struct AppState {
    pub connection: Mutex<Connection>,
}

pub fn initialize(app: &AppHandle) -> Result<AppState, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not locate the Orion data directory: {error}"))?;
    fs::create_dir_all(&app_data_dir)
        .map_err(|error| format!("Could not create the Orion data directory: {error}"))?;

    let connection = open_connection(app_data_dir.join("orion.sqlite3"))?;
    Ok(AppState {
        connection: Mutex::new(connection),
    })
}

fn open_connection(path: PathBuf) -> Result<Connection, String> {
    let connection = Connection::open(path)
        .map_err(|error| format!("Could not open the Orion database: {error}"))?;
    migrate(&connection)?;
    Ok(connection)
}

fn migrate(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            "#,
        )
        .map_err(|error| format!("Could not configure the Orion database: {error}"))?;

    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("Could not read the Orion database version: {error}"))?;

    if version == 0 {
        connection
            .execute_batch(
                r#"
            BEGIN;

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
                path TEXT NOT NULL COLLATE NOCASE UNIQUE,
                goal TEXT NOT NULL DEFAULT '' CHECK(length(goal) <= 600),
                next_action TEXT NOT NULL DEFAULT '' CHECK(length(next_action) <= 400),
                status TEXT NOT NULL DEFAULT 'planning'
                    CHECK(status IN ('planning', 'active', 'paused', 'shipped')),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS features (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
                description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 600),
                status TEXT NOT NULL DEFAULT 'planned'
                    CHECK(status IN ('planned', 'in_progress', 'working', 'blocked')),
                priority TEXT NOT NULL DEFAULT 'next'
                    CHECK(priority IN ('now', 'next', 'later')),
                evidence TEXT NOT NULL DEFAULT '' CHECK(length(evidence) <= 600),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_features_project_priority
                ON features(project_id, priority, created_at);

            CREATE TABLE IF NOT EXISTS project_tasks (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_project_tasks_project_status
                ON project_tasks(project_id, completed, created_at);

            PRAGMA user_version = 2;
            COMMIT;
            "#,
            )
            .map_err(|error| format!("Could not prepare the Orion database: {error}"))?;
    } else if version == 1 {
        connection
            .execute_batch(
                r#"
                BEGIN;
                CREATE TABLE project_tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX idx_project_tasks_project_status
                    ON project_tasks(project_id, completed, created_at);
                PRAGMA user_version = 2;
                COMMIT;
                "#,
            )
            .map_err(|error| format!("Could not upgrade the Orion database: {error}"))?;
    } else if version > 2 {
        return Err(format!(
            "This Orion database was created by a newer app version ({version})."
        ));
    }
    Ok(())
}

fn now(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", [], |row| {
            row.get(0)
        })
        .map_err(|error| format!("Could not create a database timestamp: {error}"))
}

pub fn current_timestamp(connection: &Connection) -> Result<String, String> {
    now(connection)
}

fn new_id(connection: &Connection, prefix: &str) -> Result<String, String> {
    connection
        .query_row(
            "SELECT ?1 || '_' || lower(hex(randomblob(12)))",
            [prefix],
            |row| row.get(0),
        )
        .map_err(|error| format!("Could not create a stable identifier: {error}"))
}

fn row_to_project(row: &Row<'_>) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        goal: row.get(3)?,
        next_action: row.get(4)?,
        status: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_feature(row: &Row<'_>) -> rusqlite::Result<ProjectFeature> {
    Ok(ProjectFeature {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        status: row.get(4)?,
        priority: row.get(5)?,
        evidence: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn row_to_task(row: &Row<'_>) -> rusqlite::Result<ProjectTask> {
    Ok(ProjectTask {
        id: row.get(0)?,
        project_id: row.get(1)?,
        title: row.get(2)?,
        completed: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

const PROJECT_COLUMNS: &str = "id, name, path, goal, next_action, status, created_at, updated_at";
const FEATURE_COLUMNS: &str =
    "id, project_id, name, description, status, priority, evidence, created_at, updated_at";
const TASK_COLUMNS: &str = "id, project_id, title, completed, created_at, updated_at";

pub fn list_projects(connection: &Connection) -> Result<Vec<Project>, String> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT {PROJECT_COLUMNS} FROM projects ORDER BY updated_at DESC, name COLLATE NOCASE"
        ))
        .map_err(|error| format!("Could not prepare the project list: {error}"))?;
    let rows = statement
        .query_map([], row_to_project)
        .map_err(|error| format!("Could not read registered projects: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not decode a registered project: {error}"))
}

pub fn get_project(connection: &Connection, project_id: &str) -> Result<Project, String> {
    connection
        .query_row(
            &format!("SELECT {PROJECT_COLUMNS} FROM projects WHERE id = ?1"),
            [project_id],
            row_to_project,
        )
        .optional()
        .map_err(|error| format!("Could not read the project: {error}"))?
        .ok_or_else(|| "The project is no longer registered in Orion.".to_string())
}

pub fn add_project(connection: &Connection, name: &str, path: &str) -> Result<Project, String> {
    let existing = connection
        .query_row(
            &format!("SELECT {PROJECT_COLUMNS} FROM projects WHERE path = ?1"),
            [path],
            row_to_project,
        )
        .optional()
        .map_err(|error| format!("Could not check the repository registry: {error}"))?;
    if let Some(project) = existing {
        return Ok(project);
    }

    let id = new_id(connection, "project")?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "INSERT INTO projects (id, name, path, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, 'planning', ?4, ?4)",
            params![id, name.trim(), path, timestamp],
        )
        .map_err(|error| format!("Could not register this repository: {error}"))?;
    get_project(connection, &id)
}

pub fn update_project(
    connection: &Connection,
    input: &UpdateProjectInput,
) -> Result<Project, String> {
    validate_project_status(&input.status)?;
    if input.goal.chars().count() > 600 || input.next_action.chars().count() > 400 {
        return Err("The project goal or next action is too long.".to_string());
    }
    let timestamp = now(connection)?;
    let changed = connection
        .execute(
            "UPDATE projects
             SET goal = ?2, next_action = ?3, status = ?4, updated_at = ?5
             WHERE id = ?1",
            params![
                input.id,
                input.goal.trim(),
                input.next_action.trim(),
                input.status,
                timestamp
            ],
        )
        .map_err(|error| format!("Could not update the project: {error}"))?;
    if changed == 0 {
        return Err("The project is no longer registered in Orion.".to_string());
    }
    get_project(connection, &input.id)
}

pub fn remove_project(connection: &Connection, project_id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM projects WHERE id = ?1", [project_id])
        .map_err(|error| format!("Could not remove the project from Orion: {error}"))?;
    Ok(())
}

pub fn list_features(
    connection: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectFeature>, String> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT {FEATURE_COLUMNS} FROM features
             WHERE project_id = ?1
             ORDER BY CASE priority WHEN 'now' THEN 0 WHEN 'next' THEN 1 ELSE 2 END,
                      created_at DESC"
        ))
        .map_err(|error| format!("Could not prepare the feature map: {error}"))?;
    let rows = statement
        .query_map([project_id], row_to_feature)
        .map_err(|error| format!("Could not read the feature map: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not decode a feature: {error}"))
}

pub fn add_feature(connection: &Connection, input: &AddFeatureInput) -> Result<String, String> {
    validate_feature_status(&input.status)?;
    validate_priority(&input.priority)?;
    if input.name.trim().is_empty() || input.name.chars().count() > 120 {
        return Err("Feature name must contain between 1 and 120 characters.".to_string());
    }
    if input.description.chars().count() > 600 || input.evidence.chars().count() > 600 {
        return Err("Feature description or evidence is too long.".to_string());
    }
    get_project(connection, &input.project_id)?;

    let id = new_id(connection, "feature")?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "INSERT INTO features
             (id, project_id, name, description, status, priority, evidence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![
                id,
                input.project_id,
                input.name.trim(),
                input.description.trim(),
                input.status,
                input.priority,
                input.evidence.trim(),
                timestamp
            ],
        )
        .map_err(|error| format!("Could not add the feature: {error}"))?;
    Ok(input.project_id.clone())
}

pub fn update_feature_status(
    connection: &Connection,
    feature_id: &str,
    status: &str,
) -> Result<String, String> {
    validate_feature_status(status)?;
    let project_id = connection
        .query_row(
            "SELECT project_id FROM features WHERE id = ?1",
            [feature_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not locate the feature: {error}"))?
        .ok_or_else(|| "The feature is no longer available.".to_string())?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "UPDATE features SET status = ?2, updated_at = ?3 WHERE id = ?1",
            params![feature_id, status, timestamp],
        )
        .map_err(|error| format!("Could not update the feature status: {error}"))?;
    Ok(project_id)
}

pub fn list_project_tasks(
    connection: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectTask>, String> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT {TASK_COLUMNS} FROM project_tasks
             WHERE project_id = ?1
             ORDER BY completed ASC, created_at DESC, rowid DESC"
        ))
        .map_err(|error| format!("Could not prepare the project task list: {error}"))?;
    let rows = statement
        .query_map([project_id], row_to_task)
        .map_err(|error| format!("Could not read the project task list: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not decode a project task: {error}"))
}

pub fn add_project_task(
    connection: &Connection,
    input: &AddProjectTaskInput,
) -> Result<String, String> {
    let title = input.title.trim();
    if title.is_empty() || input.title.chars().count() > 200 {
        return Err("Task title must contain between 1 and 200 characters.".to_string());
    }
    get_project(connection, &input.project_id)?;

    let id = new_id(connection, "task")?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "INSERT INTO project_tasks
             (id, project_id, title, completed, created_at, updated_at)
             VALUES (?1, ?2, ?3, 0, ?4, ?4)",
            params![id, input.project_id, title, timestamp],
        )
        .map_err(|error| format!("Could not add the project task: {error}"))?;
    Ok(input.project_id.clone())
}

pub fn set_project_task_completed(
    connection: &Connection,
    task_id: &str,
    completed: bool,
) -> Result<String, String> {
    let project_id = connection
        .query_row(
            "SELECT project_id FROM project_tasks WHERE id = ?1",
            [task_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not locate the project task: {error}"))?
        .ok_or_else(|| "The project task is no longer available.".to_string())?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "UPDATE project_tasks SET completed = ?2, updated_at = ?3 WHERE id = ?1",
            params![task_id, completed, timestamp],
        )
        .map_err(|error| format!("Could not update the project task: {error}"))?;
    Ok(project_id)
}

pub fn remove_project_task(connection: &Connection, task_id: &str) -> Result<String, String> {
    let project_id = connection
        .query_row(
            "SELECT project_id FROM project_tasks WHERE id = ?1",
            [task_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not locate the project task: {error}"))?
        .ok_or_else(|| "The project task is no longer available.".to_string())?;
    connection
        .execute("DELETE FROM project_tasks WHERE id = ?1", [task_id])
        .map_err(|error| format!("Could not remove the project task: {error}"))?;
    Ok(project_id)
}

fn validate_project_status(status: &str) -> Result<(), String> {
    match status {
        "planning" | "active" | "paused" | "shipped" => Ok(()),
        _ => Err("Unknown project status.".to_string()),
    }
}

fn validate_feature_status(status: &str) -> Result<(), String> {
    match status {
        "planned" | "in_progress" | "working" | "blocked" => Ok(()),
        _ => Err("Unknown feature status.".to_string()),
    }
}

fn validate_priority(priority: &str) -> Result<(), String> {
    match priority {
        "now" | "next" | "later" => Ok(()),
        _ => Err("Unknown feature horizon.".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("in-memory database");
        migrate(&connection).expect("schema migration");
        connection
    }

    #[test]
    fn duplicate_paths_return_the_same_project() {
        let connection = test_connection();
        let first = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("first project");
        let second = add_project(&connection, "Duplicate", "c:\\apps\\orion").expect("duplicate");
        assert_eq!(first.id, second.id);
        assert_eq!(list_projects(&connection).expect("project list").len(), 1);
    }

    #[test]
    fn invalid_feature_status_is_rejected_before_write() {
        let connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        let result = add_feature(
            &connection,
            &AddFeatureInput {
                project_id: project.id,
                name: "Overview".to_string(),
                description: String::new(),
                status: "maybe".to_string(),
                priority: "now".to_string(),
                evidence: String::new(),
            },
        );
        assert_eq!(
            result.expect_err("invalid status"),
            "Unknown feature status."
        );
    }

    #[test]
    fn project_tasks_are_scoped_sorted_and_persisted() {
        let connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        let first = AddProjectTaskInput {
            project_id: project.id.clone(),
            title: "Map the cockpit".to_string(),
        };
        add_project_task(&connection, &first).expect("first task");
        let second = AddProjectTaskInput {
            project_id: project.id.clone(),
            title: "Verify the executable".to_string(),
        };
        add_project_task(&connection, &second).expect("second task");

        let tasks = list_project_tasks(&connection, &project.id).expect("task list");
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].title, "Verify the executable");

        set_project_task_completed(&connection, &tasks[0].id, true).expect("complete task");
        let tasks = list_project_tasks(&connection, &project.id).expect("updated list");
        assert!(!tasks[0].completed);
        assert!(tasks[1].completed);
    }

    #[test]
    fn removing_a_project_removes_its_tasks() {
        let connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: project.id.clone(),
                title: "Keep this local".to_string(),
            },
        )
        .expect("task");

        remove_project(&connection, &project.id).expect("remove project");
        assert!(list_project_tasks(&connection, &project.id)
            .expect("task list")
            .is_empty());
    }
}
