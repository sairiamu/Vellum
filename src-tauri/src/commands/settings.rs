use tauri_plugin_store::StoreExt;
use serde_json::Value;

#[tauri::command]
pub async fn save_session(app_handle: tauri::AppHandle, session: Value) -> Result<(), String> {
    let store = app_handle.store("session.json").map_err(|e| e.to_string())?;
    store.set("current_session".to_string(), session);
    Ok(())
}

#[tauri::command]
pub async fn load_session(app_handle: tauri::AppHandle) -> Result<Option<Value>, String> {
    let store = app_handle.store("session.json").map_err(|e| e.to_string())?;
    Ok(store.get("current_session"))
}
