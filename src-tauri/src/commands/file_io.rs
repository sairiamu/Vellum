use tauri::Manager;
use std::fs;
use std::path::Path;

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(Path::new(&path), content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_recovery_file(app_handle: tauri::AppHandle, id: String, content: String) -> Result<(), String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("recovery");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(format!("{}.tmp", id));
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_recovery_file(app_handle: tauri::AppHandle, id: String) -> Result<String, String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("recovery");
    path.push(format!("{}.tmp", id));
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_recovery_file(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("recovery");
    path.push(format!("{}.tmp", id));
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
