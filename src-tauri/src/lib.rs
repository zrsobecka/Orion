mod domain;
mod features;
mod infrastructure;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state = infrastructure::persistence::database::initialize(app.handle())
                .map_err(std::io::Error::other)?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            features::projects::get_dashboard,
            features::projects::add_project,
            features::projects::update_project,
            features::projects::remove_project,
            features::projects::add_feature,
            features::projects::analyze_project_features,
            features::projects::accept_feature_suggestions,
            features::projects::update_feature_status,
            features::projects::start_project_focus,
            features::projects::add_project_task,
            features::projects::set_project_task_completed,
            features::projects::remove_project_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
