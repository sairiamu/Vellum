use tauri::Manager;
use std::fs;
use std::path::Path;
use chardetng::{EncodingDetector, Iso2022JpDetection, Utf8Detection};

#[derive(serde::Serialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
    pub line_ending: String,
}

#[tauri::command]
pub async fn read_text_file(path: String, encoding_override: Option<String>) -> Result<FileContent, String> {
    let bytes = fs::read(Path::new(&path)).map_err(|e| e.to_string())?;

    let encoding = if let Some(enc_name) = encoding_override {
        encoding_rs::Encoding::for_label(enc_name.as_bytes())
            .ok_or_else(|| "Unsupported encoding".to_string())?
    } else {
        let mut detector = EncodingDetector::new(Iso2022JpDetection::Deny);
        detector.feed(&bytes, true);
        detector.guess(None, Utf8Detection::Allow)
    };

    let (content, actual_encoding, _malformed) = encoding.decode(&bytes);
    let content = content.into_owned();

    // Detect line endings
    let line_ending = if content.contains("\r\n") {
        "CRLF".to_string()
    } else if content.contains('\r') {
        "CR".to_string()
    } else {
        "LF".to_string()
    };

    Ok(FileContent {
        content,
        encoding: actual_encoding.name().to_string(),
        line_ending,
    })
}

#[tauri::command]
pub async fn write_text_file(
    path: String,
    content: String,
    encoding: String,
    line_ending: String
) -> Result<(), String> {
    let mut final_content = content;

    // Convert line endings
    final_content = match line_ending.as_str() {
        "CRLF" => final_content.replace('\n', "\r\n").replace("\r\r\n", "\r\n"),
        "CR" => final_content.replace('\n', "\r"),
        _ => final_content.replace("\r\n", "\n").replace('\r', "\n"), // Default to LF
    };

    let target_encoding = encoding_rs::Encoding::for_label(encoding.as_bytes())
        .ok_or_else(|| "Unsupported encoding".to_string())?;

    let (bytes, _, _malformed) = target_encoding.encode(&final_content);

    fs::write(Path::new(&path), bytes).map_err(|e| e.to_string())
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
