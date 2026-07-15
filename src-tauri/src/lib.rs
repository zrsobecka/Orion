mod commands;
mod models;
mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state =
                services::database::initialize(app.handle()).map_err(std::io::Error::other)?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_dashboard,
            commands::add_project,
            commands::update_project,
            commands::remove_project,
            commands::add_feature,
            commands::update_feature_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
