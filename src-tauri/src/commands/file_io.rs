use tauri::Manager;
use std::fs::{self, File};
use std::io::{Read, BufReader};
use std::path::Path;
use chardetng::{EncodingDetector, Iso2022JpDetection, Utf8Detection};
use tauri::ipc::Channel;

#[derive(serde::Serialize)]
pub struct FileContent {
    pub content: String,
    pub encoding: String,
    pub line_ending: String,
    pub size: u64,
}

#[derive(serde::Serialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum StreamPayload {
    Chunk(String),
    Complete { encoding: String, line_ending: String },
    Error(String),
}

#[tauri::command]
pub async fn read_text_file(path: String, encoding_override: Option<String>) -> Result<FileContent, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let size = metadata.len();

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
        size,
    })
}

#[tauri::command]
pub fn read_text_file_stream(
    path: String,
    on_event: Channel<StreamPayload>,
    encoding_override: Option<String>
) {
    std::thread::spawn(move || {
        let result = (|| -> Result<(), String> {
            let file = File::open(&path).map_err(|e| e.to_string())?;
            let mut reader = BufReader::new(file);

            // First 4KB for encoding detection
            let mut head = [0u8; 4096];
            let n = reader.read(&mut head).map_err(|e| e.to_string())?;
            let head_slice = &head[..n];

            let encoding = if let Some(enc_name) = encoding_override {
                encoding_rs::Encoding::for_label(enc_name.as_bytes())
                    .ok_or_else(|| "Unsupported encoding".to_string())?
            } else {
                let mut detector = EncodingDetector::new(Iso2022JpDetection::Deny);
                detector.feed(head_slice, n < 4096);
                detector.guess(None, Utf8Detection::Allow)
            };

            let mut decoder = encoding.new_decoder();
            let mut line_ending = "LF".to_string();
            let mut detected_line_ending = false;

            // Decode the head
            let mut head_str = String::with_capacity(head_slice.len() * 2);
            let mut buffer = vec![0u8; 65536]; // 64KB chunks
            let (res, _read, _written, _had_errors) = decoder.decode_to_str(head_slice, &mut head_str, n < 4096);

            if !detected_line_ending {
                if head_str.contains("\r\n") { line_ending = "CRLF".to_string(); detected_line_ending = true; }
                else if head_str.contains('\r') { line_ending = "CR".to_string(); detected_line_ending = true; }
            }
            on_event.send(StreamPayload::Chunk(head_str)).map_err(|e| e.to_string())?;

            if res == encoding_rs::CoderResult::InputEmpty {
                 // Already finished head
            }

            // Stream the rest
            loop {
                let n = reader.read(&mut buffer).map_err(|e| e.to_string())?;
                if n == 0 {
                    let mut tail = String::with_capacity(32);
                    let _ = decoder.decode_to_str(&[], &mut tail, true);
                    if !tail.is_empty() {
                        on_event.send(StreamPayload::Chunk(tail)).map_err(|e| e.to_string())?;
                    }
                    break;
                }

                let mut chunk_str = String::with_capacity(n * 2);
                let _ = decoder.decode_to_str(&buffer[..n], &mut chunk_str, false);

                if !detected_line_ending {
                    if chunk_str.contains("\r\n") { line_ending = "CRLF".to_string(); detected_line_ending = true; }
                    else if chunk_str.contains('\r') { line_ending = "CR".to_string(); detected_line_ending = true; }
                }
                on_event.send(StreamPayload::Chunk(chunk_str)).map_err(|e| e.to_string())?;
            }

            on_event.send(StreamPayload::Complete {
                encoding: encoding.name().to_string(),
                line_ending
            }).map_err(|e| e.to_string())?;

            Ok(())
        })();

        if let Err(e) = result {
            let _ = on_event.send(StreamPayload::Error(e));
        }
    });
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
