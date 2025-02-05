mod globals;
mod handlers;
mod models;
mod utils;

use handlers::{
    change_directory, connect_ftp_server, delete_files, disconnect_ftp_server, download_file,
    refresh_files,
};
use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

fn setup_window(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").unwrap();
    // app.handle().save_window_state()
    app.handle()
        .save_window_state(StateFlags::POSITION | StateFlags::SIZE)
        .unwrap();

    window.open_devtools();

    let _ = window.set_decorations(false);
    let _ = window.set_shadow(false);
    let _ = WebviewWindowBuilder::new(app, "main", WebviewUrl::default()).inner_size(750.0, 900.0);
    let _ = window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 100.0,
            height: 100.0,
        }))
        .unwrap();

    match window.restore_state(StateFlags::POSITION | StateFlags::SIZE) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.into()),
    }
}

fn create_window_builder() -> tauri_plugin_window_state::Builder {
    tauri_plugin_window_state::Builder::new()
        .with_state_flags(StateFlags::POSITION | StateFlags::SIZE)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(create_window_builder().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            connect_ftp_server,
            change_directory,
            disconnect_ftp_server,
            refresh_files,
            delete_files,
            download_file
        ])
        .setup(setup_window)
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
