use std::{fs, path::PathBuf, sync::Mutex};

use rusqlite::{params, Connection, OptionalExtension, Row};
use tauri::{AppHandle, Manager};

use crate::domain::{
    AcceptFeatureSuggestionsInput, AddFeatureInput, AddProjectTaskInput, CommitAnalysis, Project,
    ProjectFeature, ProjectFocus, ProjectTask, ReviewCommitAnalysisInput, StartProjectFocusInput,
    UpdateProjectInput,
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

            CREATE TABLE IF NOT EXISTS project_focuses (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
                started_at TEXT NOT NULL,
                ended_at TEXT
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_project_focuses_one_active
                ON project_focuses(project_id) WHERE status = 'active';
            CREATE INDEX IF NOT EXISTS idx_project_focuses_history
                ON project_focuses(project_id, started_at DESC);

            CREATE TABLE IF NOT EXISTS project_tasks (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                focus_id TEXT REFERENCES project_focuses(id) ON DELETE SET NULL,
                feature_id TEXT REFERENCES features(id) ON DELETE SET NULL,
                title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_project_tasks_project_status
                ON project_tasks(project_id, completed, created_at);
            CREATE INDEX IF NOT EXISTS idx_project_tasks_feature
                ON project_tasks(feature_id, completed, created_at);
            CREATE INDEX IF NOT EXISTS idx_project_tasks_focus
                ON project_tasks(focus_id, completed, created_at);

            PRAGMA user_version = 4;
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
                ALTER TABLE project_tasks ADD COLUMN feature_id TEXT
                    REFERENCES features(id) ON DELETE SET NULL;
                CREATE INDEX idx_project_tasks_feature
                    ON project_tasks(feature_id, completed, created_at);
                CREATE TABLE project_focuses (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                    status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
                    started_at TEXT NOT NULL,
                    ended_at TEXT
                );
                CREATE UNIQUE INDEX idx_project_focuses_one_active
                    ON project_focuses(project_id) WHERE status = 'active';
                CREATE INDEX idx_project_focuses_history
                    ON project_focuses(project_id, started_at DESC);
                INSERT INTO project_focuses (id, project_id, title, status, started_at)
                    SELECT 'focus_' || lower(hex(randomblob(12))), id,
                        CASE WHEN trim(next_action) = '' THEN 'Current focus' ELSE next_action END,
                        'active', updated_at
                    FROM projects;
                ALTER TABLE project_tasks ADD COLUMN focus_id TEXT
                    REFERENCES project_focuses(id) ON DELETE SET NULL;
                UPDATE project_tasks SET focus_id = (
                    SELECT id FROM project_focuses
                    WHERE project_focuses.project_id = project_tasks.project_id
                        AND status = 'active'
                );
                CREATE INDEX idx_project_tasks_focus
                    ON project_tasks(focus_id, completed, created_at);
                PRAGMA user_version = 4;
                COMMIT;
                "#,
            )
            .map_err(|error| format!("Could not upgrade the Orion database: {error}"))?;
    } else if version == 2 {
        connection
            .execute_batch(
                r#"
                BEGIN;
                ALTER TABLE project_tasks ADD COLUMN feature_id TEXT
                    REFERENCES features(id) ON DELETE SET NULL;
                CREATE INDEX idx_project_tasks_feature
                    ON project_tasks(feature_id, completed, created_at);
                CREATE TABLE project_focuses (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                    status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
                    started_at TEXT NOT NULL,
                    ended_at TEXT
                );
                CREATE UNIQUE INDEX idx_project_focuses_one_active
                    ON project_focuses(project_id) WHERE status = 'active';
                CREATE INDEX idx_project_focuses_history
                    ON project_focuses(project_id, started_at DESC);
                INSERT INTO project_focuses (id, project_id, title, status, started_at)
                    SELECT 'focus_' || lower(hex(randomblob(12))), id,
                        CASE WHEN trim(next_action) = '' THEN 'Current focus' ELSE next_action END,
                        'active', updated_at
                    FROM projects;
                ALTER TABLE project_tasks ADD COLUMN focus_id TEXT
                    REFERENCES project_focuses(id) ON DELETE SET NULL;
                UPDATE project_tasks SET focus_id = (
                    SELECT id FROM project_focuses
                    WHERE project_focuses.project_id = project_tasks.project_id
                        AND status = 'active'
                );
                CREATE INDEX idx_project_tasks_focus
                    ON project_tasks(focus_id, completed, created_at);
                PRAGMA user_version = 4;
                COMMIT;
                "#,
            )
            .map_err(|error| format!("Could not add task-feature links: {error}"))?;
    } else if version == 3 {
        connection
            .execute_batch(
                r#"
                BEGIN;
                CREATE TABLE project_focuses (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
                    status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
                    started_at TEXT NOT NULL,
                    ended_at TEXT
                );
                CREATE UNIQUE INDEX idx_project_focuses_one_active
                    ON project_focuses(project_id) WHERE status = 'active';
                CREATE INDEX idx_project_focuses_history
                    ON project_focuses(project_id, started_at DESC);
                INSERT INTO project_focuses (id, project_id, title, status, started_at)
                    SELECT 'focus_' || lower(hex(randomblob(12))), id,
                        CASE WHEN trim(next_action) = '' THEN 'Current focus' ELSE next_action END,
                        'active', updated_at
                    FROM projects;
                ALTER TABLE project_tasks ADD COLUMN focus_id TEXT
                    REFERENCES project_focuses(id) ON DELETE SET NULL;
                UPDATE project_tasks SET focus_id = (
                    SELECT id FROM project_focuses
                    WHERE project_focuses.project_id = project_tasks.project_id
                        AND status = 'active'
                );
                CREATE INDEX idx_project_tasks_focus
                    ON project_tasks(focus_id, completed, created_at);
                PRAGMA user_version = 4;
                COMMIT;
                "#,
            )
            .map_err(|error| format!("Could not add project focuses: {error}"))?;
    } else if version > 5 {
        return Err(format!(
            "This Orion database was created by a newer app version ({version})."
        ));
    }

    let version = connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("Could not confirm the Orion database version: {error}"))?;
    if version == 4 {
        connection
            .execute_batch(
                r#"
                BEGIN;
                CREATE TABLE commit_analyses (
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    commit_hash TEXT NOT NULL,
                    prompt_version TEXT NOT NULL,
                    model TEXT NOT NULL,
                    analysis_json TEXT NOT NULL,
                    review_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK(review_status IN ('pending', 'accepted', 'rejected')),
                    created_at TEXT NOT NULL,
                    reviewed_at TEXT,
                    PRIMARY KEY(project_id, commit_hash, prompt_version)
                );
                CREATE INDEX idx_commit_analyses_project_status
                    ON commit_analyses(project_id, review_status, created_at DESC);
                PRAGMA user_version = 5;
                COMMIT;
                "#,
            )
            .map_err(|error| format!("Could not add cached commit analyses: {error}"))?;
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
        focus_id: row.get(2)?,
        feature_id: row.get(3)?,
        title: row.get(4)?,
        completed: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_focus(row: &Row<'_>) -> rusqlite::Result<ProjectFocus> {
    Ok(ProjectFocus {
        id: row.get(0)?,
        project_id: row.get(1)?,
        title: row.get(2)?,
        status: row.get(3)?,
        started_at: row.get(4)?,
        ended_at: row.get(5)?,
    })
}

const PROJECT_COLUMNS: &str = "id, name, path, goal, next_action, status, created_at, updated_at";
const FEATURE_COLUMNS: &str =
    "id, project_id, name, description, status, priority, evidence, created_at, updated_at";
const FOCUS_COLUMNS: &str = "id, project_id, title, status, started_at, ended_at";
const TASK_COLUMNS: &str =
    "id, project_id, focus_id, feature_id, title, completed, created_at, updated_at";

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

pub fn add_feature_suggestions(
    connection: &mut Connection,
    input: &AcceptFeatureSuggestionsInput,
) -> Result<String, String> {
    if input.suggestions.is_empty() || input.suggestions.len() > 20 {
        return Err("Select between 1 and 20 feature suggestions.".to_string());
    }
    get_project(connection, &input.project_id)?;
    for suggestion in &input.suggestions {
        validate_feature_status(&suggestion.suggested_status)?;
        if suggestion.name.trim().is_empty() || suggestion.name.chars().count() > 120 {
            return Err("Feature name must contain between 1 and 120 characters.".to_string());
        }
        if suggestion.description.chars().count() > 600 || suggestion.evidence.chars().count() > 600
        {
            return Err("Feature description or evidence is too long.".to_string());
        }
        if !suggestion.confidence.is_finite() || !(0.0..=1.0).contains(&suggestion.confidence) {
            return Err("Feature suggestion confidence must be between 0 and 1.".to_string());
        }
    }

    let mut known_names = list_features(connection, &input.project_id)?
        .into_iter()
        .map(|feature| feature.name.trim().to_lowercase())
        .collect::<std::collections::HashSet<_>>();
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start the feature update: {error}"))?;
    let timestamp = now(&transaction)?;
    for suggestion in &input.suggestions {
        let normalized_name = suggestion.name.trim().to_lowercase();
        if !known_names.insert(normalized_name) {
            continue;
        }
        let id = new_id(&transaction, "feature")?;
        transaction
            .execute(
                "INSERT INTO features
                 (id, project_id, name, description, status, priority, evidence, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'later', ?6, ?7, ?7)",
                params![
                    id,
                    input.project_id,
                    suggestion.name.trim(),
                    suggestion.description.trim(),
                    suggestion.suggested_status,
                    suggestion.evidence.trim(),
                    timestamp
                ],
            )
            .map_err(|error| format!("Could not add an analyzed feature: {error}"))?;
    }
    transaction
        .commit()
        .map_err(|error| format!("Could not save the analyzed features: {error}"))?;
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

pub fn list_project_focuses(
    connection: &Connection,
    project_id: &str,
) -> Result<Vec<ProjectFocus>, String> {
    let mut statement = connection
        .prepare(&format!(
            "SELECT {FOCUS_COLUMNS} FROM project_focuses
             WHERE project_id = ?1
             ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, started_at DESC, rowid DESC"
        ))
        .map_err(|error| format!("Could not prepare the project focus list: {error}"))?;
    let rows = statement
        .query_map([project_id], row_to_focus)
        .map_err(|error| format!("Could not read the project focus list: {error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not decode a project focus: {error}"))
}

pub fn start_project_focus(
    connection: &mut Connection,
    input: &StartProjectFocusInput,
) -> Result<String, String> {
    let title = input.title.trim();
    if title.is_empty() || input.title.chars().count() > 200 {
        return Err("Focus title must contain between 1 and 200 characters.".to_string());
    }
    get_project(connection, &input.project_id)?;

    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start a focus update: {error}"))?;
    let timestamp = now(&transaction)?;
    transaction
        .execute(
            "UPDATE project_focuses
             SET status = 'archived', ended_at = ?2
             WHERE project_id = ?1 AND status = 'active'",
            params![input.project_id, timestamp],
        )
        .map_err(|error| format!("Could not archive the previous focus: {error}"))?;
    let id = new_id(&transaction, "focus")?;
    transaction
        .execute(
            "INSERT INTO project_focuses
             (id, project_id, title, status, started_at)
             VALUES (?1, ?2, ?3, 'active', ?4)",
            params![id, input.project_id, title, timestamp],
        )
        .map_err(|error| format!("Could not create the project focus: {error}"))?;
    transaction
        .commit()
        .map_err(|error| format!("Could not save the project focus: {error}"))?;
    Ok(input.project_id.clone())
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
    let focus_id = connection
        .query_row(
            "SELECT id FROM project_focuses WHERE project_id = ?1 AND status = 'active'",
            [&input.project_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not check the active project focus: {error}"))?
        .ok_or_else(|| "Start a project focus before adding tasks.".to_string())?;
    if let Some(feature_id) = input.feature_id.as_deref() {
        let feature_project_id = connection
            .query_row(
                "SELECT project_id FROM features WHERE id = ?1",
                [feature_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("Could not check the linked feature: {error}"))?
            .ok_or_else(|| "The linked feature is no longer available.".to_string())?;
        if feature_project_id != input.project_id {
            return Err("A task can only link to a feature in the same project.".to_string());
        }
    }

    let id = new_id(connection, "task")?;
    let timestamp = now(connection)?;
    connection
        .execute(
            "INSERT INTO project_tasks
            (id, project_id, focus_id, feature_id, title, completed, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6)",
            params![
                id,
                input.project_id,
                focus_id,
                input.feature_id,
                title,
                timestamp
            ],
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

pub fn get_cached_commit_analysis(
    connection: &Connection,
    project_id: &str,
    commit_hash: &str,
    prompt_version: &str,
) -> Result<Option<CommitAnalysis>, String> {
    connection
        .query_row(
            "SELECT analysis_json, model, review_status, created_at, reviewed_at
             FROM commit_analyses
             WHERE project_id = ?1 AND commit_hash = ?2 AND prompt_version = ?3",
            params![project_id, commit_hash, prompt_version],
            |row| {
                let json: String = row.get(0)?;
                let mut analysis =
                    serde_json::from_str::<CommitAnalysis>(&json).map_err(|error| {
                        rusqlite::Error::FromSqlConversionFailure(
                            json.len(),
                            rusqlite::types::Type::Text,
                            Box::new(error),
                        )
                    })?;
                analysis.model = row.get(1)?;
                analysis.review_status = row.get(2)?;
                analysis.created_at = row.get(3)?;
                analysis.reviewed_at = row.get(4)?;
                Ok(analysis)
            },
        )
        .optional()
        .map_err(|error| format!("Could not read the cached commit analysis: {error}"))
}

pub fn save_commit_analysis(
    connection: &Connection,
    project_id: &str,
    prompt_version: &str,
    analysis: &CommitAnalysis,
) -> Result<CommitAnalysis, String> {
    let json = serde_json::to_string(analysis)
        .map_err(|error| format!("Could not encode the commit analysis: {error}"))?;
    connection
        .execute(
            "INSERT OR IGNORE INTO commit_analyses
             (project_id, commit_hash, prompt_version, model, analysis_json, review_status,
              created_at, reviewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                project_id,
                analysis.commit_hash,
                prompt_version,
                analysis.model,
                json,
                analysis.review_status,
                analysis.created_at,
                analysis.reviewed_at,
            ],
        )
        .map_err(|error| format!("Could not cache the commit analysis: {error}"))?;
    get_cached_commit_analysis(
        connection,
        project_id,
        &analysis.commit_hash,
        prompt_version,
    )?
    .ok_or_else(|| "The commit analysis cache could not be read after saving.".to_string())
}

pub fn review_commit_analysis(
    connection: &mut Connection,
    input: &ReviewCommitAnalysisInput,
    prompt_version: &str,
) -> Result<String, String> {
    if !matches!(input.action.as_str(), "accept" | "reject") {
        return Err("Unknown commit-analysis review action.".to_string());
    }
    get_project(connection, &input.project_id)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("Could not start the analysis review: {error}"))?;
    let current_status = transaction
        .query_row(
            "SELECT review_status FROM commit_analyses
             WHERE project_id = ?1 AND commit_hash = ?2 AND prompt_version = ?3",
            params![input.project_id, input.commit_hash, prompt_version],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Could not locate the commit analysis: {error}"))?
        .ok_or_else(|| "Analyze this commit before reviewing its proposals.".to_string())?;
    let target_status = if input.action == "accept" {
        "accepted"
    } else {
        "rejected"
    };
    if current_status == target_status {
        return Ok(input.project_id.clone());
    }
    if current_status != "pending" {
        return Err("This commit analysis was already reviewed.".to_string());
    }

    let timestamp = now(&transaction)?;
    if input.action == "accept" {
        if input.complete_task {
            let task_id = input
                .task_id
                .as_deref()
                .ok_or_else(|| "Choose a task before marking it complete.".to_string())?;
            let task_project = transaction
                .query_row(
                    "SELECT project_id FROM project_tasks WHERE id = ?1",
                    [task_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| format!("Could not validate the proposed task: {error}"))?
                .ok_or_else(|| "The proposed task is no longer available.".to_string())?;
            if task_project != input.project_id {
                return Err("The proposed task belongs to another project.".to_string());
            }
            transaction
                .execute(
                    "UPDATE project_tasks SET completed = 1, updated_at = ?2 WHERE id = ?1",
                    params![task_id, timestamp],
                )
                .map_err(|error| format!("Could not complete the approved task: {error}"))?;
        }
        if let Some(feature_id) = input.feature_id.as_deref() {
            let status = input
                .feature_status
                .as_deref()
                .ok_or_else(|| "Choose a feature status before applying it.".to_string())?;
            validate_feature_status(status)?;
            let feature_project = transaction
                .query_row(
                    "SELECT project_id FROM features WHERE id = ?1",
                    [feature_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|error| format!("Could not validate the proposed feature: {error}"))?
                .ok_or_else(|| "The proposed feature is no longer available.".to_string())?;
            if feature_project != input.project_id {
                return Err("The proposed feature belongs to another project.".to_string());
            }
            transaction
                .execute(
                    "UPDATE features SET status = ?2, updated_at = ?3 WHERE id = ?1",
                    params![feature_id, status, timestamp],
                )
                .map_err(|error| format!("Could not apply the approved feature status: {error}"))?;
        }
    }
    transaction
        .execute(
            "UPDATE commit_analyses
             SET review_status = ?4, reviewed_at = ?5
             WHERE project_id = ?1 AND commit_hash = ?2 AND prompt_version = ?3",
            params![
                input.project_id,
                input.commit_hash,
                prompt_version,
                target_status,
                timestamp
            ],
        )
        .map_err(|error| format!("Could not record the analysis review: {error}"))?;
    transaction
        .commit()
        .map_err(|error| format!("Could not save the approved progress updates: {error}"))?;
    Ok(input.project_id.clone())
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

    fn start_focus(connection: &mut Connection, project_id: &str, title: &str) -> String {
        start_project_focus(
            connection,
            &StartProjectFocusInput {
                project_id: project_id.to_string(),
                title: title.to_string(),
            },
        )
        .expect("focus");
        list_project_focuses(connection, project_id)
            .expect("focuses")
            .into_iter()
            .find(|focus| focus.status == "active")
            .expect("active focus")
            .id
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
    fn accepted_feature_suggestions_are_deduplicated_and_use_a_neutral_horizon() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        add_feature(
            &connection,
            &AddFeatureInput {
                project_id: project.id.clone(),
                name: "Project search".to_string(),
                description: String::new(),
                status: "working".to_string(),
                priority: "now".to_string(),
                evidence: "src/search.ts".to_string(),
            },
        )
        .expect("existing feature");

        add_feature_suggestions(
            &mut connection,
            &AcceptFeatureSuggestionsInput {
                project_id: project.id.clone(),
                suggestions: vec![
                    crate::domain::FeatureSuggestion {
                        name: "project SEARCH".to_string(),
                        description: "Duplicate".to_string(),
                        suggested_status: "working".to_string(),
                        evidence: "src/search.ts".to_string(),
                        confidence: 0.9,
                    },
                    crate::domain::FeatureSuggestion {
                        name: "Report export".to_string(),
                        description: "Exports reports.".to_string(),
                        suggested_status: "in_progress".to_string(),
                        evidence: "src/reports.ts".to_string(),
                        confidence: 0.8,
                    },
                ],
            },
        )
        .expect("accepted suggestions");

        let features = list_features(&connection, &project.id).expect("features");
        assert_eq!(features.len(), 2);
        let report = features
            .iter()
            .find(|feature| feature.name == "Report export")
            .expect("new report feature");
        assert_eq!(report.priority, "later");
        assert_eq!(report.status, "in_progress");
    }

    #[test]
    fn project_tasks_are_scoped_sorted_and_persisted() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        let focus_id = start_focus(&mut connection, &project.id, "Ship the cockpit");
        let first = AddProjectTaskInput {
            project_id: project.id.clone(),
            feature_id: None,
            title: "Map the cockpit".to_string(),
        };
        add_project_task(&connection, &first).expect("first task");
        let second = AddProjectTaskInput {
            project_id: project.id.clone(),
            feature_id: None,
            title: "Verify the executable".to_string(),
        };
        add_project_task(&connection, &second).expect("second task");

        let tasks = list_project_tasks(&connection, &project.id).expect("task list");
        assert_eq!(tasks.len(), 2);
        assert_eq!(tasks[0].title, "Verify the executable");
        assert_eq!(tasks[0].focus_id.as_deref(), Some(focus_id.as_str()));

        set_project_task_completed(&connection, &tasks[0].id, true).expect("complete task");
        let tasks = list_project_tasks(&connection, &project.id).expect("updated list");
        assert!(!tasks[0].completed);
        assert!(tasks[1].completed);
    }

    #[test]
    fn project_tasks_can_link_only_to_features_from_the_same_project() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        let other = add_project(&connection, "Other", "C:\\Apps\\Other").expect("other project");
        start_focus(&mut connection, &project.id, "Polish Orion");
        start_focus(&mut connection, &other.id, "Polish Other");
        add_feature(
            &connection,
            &AddFeatureInput {
                project_id: project.id.clone(),
                name: "Project cockpit".to_string(),
                description: String::new(),
                status: "in_progress".to_string(),
                priority: "now".to_string(),
                evidence: String::new(),
            },
        )
        .expect("feature");
        let feature = list_features(&connection, &project.id)
            .expect("features")
            .remove(0);

        add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: project.id.clone(),
                feature_id: Some(feature.id.clone()),
                title: "Polish the cockpit".to_string(),
            },
        )
        .expect("linked task");
        let task = list_project_tasks(&connection, &project.id)
            .expect("tasks")
            .remove(0);
        assert_eq!(task.feature_id, Some(feature.id.clone()));

        let error = add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: other.id,
                feature_id: Some(feature.id),
                title: "Invalid cross-project link".to_string(),
            },
        )
        .expect_err("cross-project link");
        assert_eq!(
            error,
            "A task can only link to a feature in the same project."
        );
    }

    #[test]
    fn removing_a_project_removes_its_tasks() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        start_focus(&mut connection, &project.id, "Keep this local");
        add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: project.id.clone(),
                feature_id: None,
                title: "Keep this local".to_string(),
            },
        )
        .expect("task");

        remove_project(&connection, &project.id).expect("remove project");
        assert!(list_project_tasks(&connection, &project.id)
            .expect("task list")
            .is_empty());
    }

    #[test]
    fn starting_a_new_focus_archives_the_previous_focus_without_moving_tasks() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        let first_focus = start_focus(&mut connection, &project.id, "Build the task loop");
        add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: project.id.clone(),
                feature_id: None,
                title: "Persist tasks".to_string(),
            },
        )
        .expect("task");

        let second_focus = start_focus(&mut connection, &project.id, "Explain commit evidence");
        let focuses = list_project_focuses(&connection, &project.id).expect("focus history");
        assert_eq!(focuses.len(), 2);
        assert_eq!(focuses[0].id, second_focus);
        assert_eq!(focuses[0].status, "active");
        assert_eq!(focuses[1].id, first_focus);
        assert_eq!(focuses[1].status, "archived");
        assert!(focuses[1].ended_at.is_some());

        let tasks = list_project_tasks(&connection, &project.id).expect("tasks");
        assert_eq!(tasks[0].focus_id.as_deref(), Some(first_focus.as_str()));
    }

    #[test]
    fn version_three_migration_preserves_tasks_in_an_active_focus() {
        let connection = Connection::open_in_memory().expect("in-memory database");
        connection
            .execute_batch(
                r#"
                CREATE TABLE projects (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL,
                    goal TEXT NOT NULL DEFAULT '',
                    next_action TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE features (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE
                );
                CREATE TABLE project_tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    feature_id TEXT REFERENCES features(id) ON DELETE SET NULL,
                    title TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                INSERT INTO projects
                    (id, name, path, goal, next_action, status, created_at, updated_at)
                    VALUES ('project-1', 'Orion', 'C:\Apps\Orion', '', 'Ship the cockpit',
                        'active', '2026-07-17T10:00:00Z', '2026-07-17T10:00:00Z');
                INSERT INTO project_tasks
                    (id, project_id, title, completed, created_at, updated_at)
                    VALUES ('task-1', 'project-1', 'Keep this task', 1,
                        '2026-07-17T10:00:00Z', '2026-07-17T10:00:00Z');
                PRAGMA user_version = 3;
                "#,
            )
            .expect("version three fixture");

        migrate(&connection).expect("focus migration");
        let focuses = list_project_focuses(&connection, "project-1").expect("focuses");
        let tasks = list_project_tasks(&connection, "project-1").expect("tasks");
        assert_eq!(focuses.len(), 1);
        assert_eq!(focuses[0].title, "Ship the cockpit");
        assert_eq!(focuses[0].status, "active");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Keep this task");
        assert_eq!(tasks[0].focus_id.as_deref(), Some(focuses[0].id.as_str()));
    }

    #[test]
    fn approved_commit_analysis_applies_only_reviewed_task_and_feature_updates() {
        let mut connection = test_connection();
        let project = add_project(&connection, "Orion", "C:\\Apps\\Orion").expect("project");
        start_focus(&mut connection, &project.id, "Close the evidence loop");
        add_feature(
            &connection,
            &AddFeatureInput {
                project_id: project.id.clone(),
                name: "Commit evidence".to_string(),
                description: String::new(),
                status: "in_progress".to_string(),
                priority: "now".to_string(),
                evidence: String::new(),
            },
        )
        .expect("feature");
        let feature = list_features(&connection, &project.id)
            .expect("features")
            .remove(0);
        add_project_task(
            &connection,
            &AddProjectTaskInput {
                project_id: project.id.clone(),
                feature_id: Some(feature.id.clone()),
                title: "Show real commit files".to_string(),
            },
        )
        .expect("task");
        let task = list_project_tasks(&connection, &project.id)
            .expect("tasks")
            .remove(0);
        let analysis = CommitAnalysis {
            commit_hash: "abcdef1234567890".to_string(),
            model: "local-model".to_string(),
            what_changed: "Commit details are visible.".to_string(),
            now_possible: "Inspect evidence in Orion.".to_string(),
            caution: String::new(),
            task_suggestion: None,
            feature_suggestion: None,
            focus_impact: "One focus task may be complete.".to_string(),
            goal_impact: "Health evidence improved.".to_string(),
            review_status: "pending".to_string(),
            created_at: current_timestamp(&connection).expect("timestamp"),
            reviewed_at: None,
        };
        save_commit_analysis(&connection, &project.id, "test-v1", &analysis)
            .expect("cached analysis");
        let mut duplicate = analysis.clone();
        duplicate.what_changed = "A duplicate model response.".to_string();
        assert_eq!(
            save_commit_analysis(&connection, &project.id, "test-v1", &duplicate)
                .expect("deduplicated analysis")
                .what_changed,
            analysis.what_changed
        );

        let review = ReviewCommitAnalysisInput {
            project_id: project.id.clone(),
            commit_hash: analysis.commit_hash.clone(),
            action: "accept".to_string(),
            task_id: Some(task.id),
            complete_task: true,
            feature_id: Some(feature.id),
            feature_status: Some("working".to_string()),
        };
        review_commit_analysis(&mut connection, &review, "test-v1").expect("approved review");
        review_commit_analysis(&mut connection, &review, "test-v1")
            .expect("idempotent approved review");

        assert!(list_project_tasks(&connection, &project.id).expect("tasks")[0].completed);
        assert_eq!(
            list_features(&connection, &project.id).expect("features")[0].status,
            "working"
        );
        assert_eq!(
            get_cached_commit_analysis(&connection, &project.id, &analysis.commit_hash, "test-v1")
                .expect("cache")
                .expect("analysis")
                .review_status,
            "accepted"
        );
    }
}
