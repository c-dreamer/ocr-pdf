// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ProcessResult {
    text: String,
    method: String,
    quality: f64,
    file_type: String,
    error: Option<String>,
}

#[tauri::command]
fn process_document(file_path: &str) -> Result<ProcessResult, String> {
    let output = Command::new("ocr-pdf")
        .args(["process", file_path])
        .output()
        .map_err(|e| format!("Failed to execute ocr-pdf: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ocr-pdf failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let text = stdout.trim().to_string();

    // Get quality info from verbose output
    let info_output = Command::new("ocr-pdf")
        .args(["-v", "process", file_path])
        .output()
        .map_err(|_| "".to_string())
        .ok();

    let mut method = "pymupdf".to_string();
    let mut quality = 1.0;

    if let Some(info) = info_output {
        let info_str = String::from_utf8_lossy(&info.stderr);
        for line in info_str.lines() {
            if line.contains("Extracted") {
                if let Some(start) = line.find('(') {
                    if let Some(end) = line.find(',') {
                        if start + 1 < end {
                            method = line[start + 1..end].to_string();
                        }
                    }
                }
                if let Some(qs) = line.find("quality=") {
                    let val_str = line[qs + 8..].trim_end_matches(')');
                    if let Ok(v) = val_str.parse::<f64>() {
                        quality = v;
                    }
                }
            }
        }
    }

    Ok(ProcessResult {
        text,
        method,
        quality,
        file_type: "pdf".to_string(),
        error: None,
    })
}

#[tauri::command]
fn process_batch(input_dir: &str, output_dir: &str) -> Result<String, String> {
    let output = Command::new("ocr-pdf")
        .args(["batch", input_dir, output_dir, "--workers", "4"])
        .output()
        .map_err(|e| format!("Failed to execute ocr-pdf batch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Batch processing failed: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![process_document, process_batch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
