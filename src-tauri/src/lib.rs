use std::fs;
use tauri::Manager;

#[tauri::command]
fn save_game(app_handle: tauri::AppHandle, data: String) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let save_path = app_dir.join("save.json");
    fs::write(save_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_game(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let save_path = app_dir.join("save.json");
    if save_path.exists() {
        fs::read_to_string(save_path).map_err(|e| e.to_string())
    } else {
        Err("No save file found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![save_game, load_game])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
