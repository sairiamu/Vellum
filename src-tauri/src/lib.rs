pub mod commands;
pub mod models;
pub mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_io::read_text_file,
            commands::file_io::read_text_file_stream,
            commands::file_io::write_text_file,
            commands::file_io::save_recovery_file,
            commands::file_io::load_recovery_file,
            commands::file_io::clear_recovery_file,
            commands::file_tree::get_directory_tree,
            commands::file_tree::reveal_in_explorer,
            commands::file_tree::delete_file,
            commands::file_tree::rename_file,
            commands::settings::save_session,
            commands::settings::load_session,
            commands::settings::save_settings,
            commands::settings::load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
