use walkdir::WalkDir;
use crate::models::TreeNode;
use std::path::Path;
use std::ffi::OsStr;
use std::fs;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn get_directory_tree(path: String, show_all: bool) -> Result<TreeNode, String> {
    let root_path = Path::new(&path);
    if !root_path.is_dir() {
        return Err("Not a directory".to_string());
    }

    Ok(build_tree(root_path, show_all))
}

#[tauri::command]
pub async fn reveal_in_explorer(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    app_handle.shell().open(path, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(Path::new(&old_path), Path::new(&new_path)).map_err(|e| e.to_string())
}

fn build_tree(path: &Path, show_all: bool) -> TreeNode {
    let name = path.file_name()
        .and_then(OsStr::to_str)
        .unwrap_or("")
        .to_string();

    let mut children = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            let entry_name = entry_path.file_name()
                .and_then(OsStr::to_str)
                .unwrap_or("");

            if !show_all && !entry_path.is_dir() {
                let ext = entry_path.extension().and_then(OsStr::to_str).unwrap_or("").to_lowercase();
                if !matches!(ext.as_str(), "txt" | "md" | "json" | "csv" | "log") {
                    continue;
                }
            }

            if entry_path.is_dir() {
                children.push(build_tree(&entry_path, show_all));
            } else {
                children.push(TreeNode {
                    name: entry_name.to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    children: None,
                });
            }
        }
    }

    // Sort: folders first, then files alphabetically
    children.sort_by(|a, b| {
        let a_is_dir = a.children.is_some();
        let b_is_dir = b.children.is_some();
        if a_is_dir != b_is_dir {
            b_is_dir.cmp(&a_is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    TreeNode {
        name,
        path: path.to_string_lossy().to_string(),
        children: Some(children),
    }
}
