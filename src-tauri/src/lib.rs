use chrono::NaiveDate;
use ftp::FtpError;
use ftp::FtpStream;
use lazy_static::lazy_static;
use serde_json::json;
use serde_json::Value;
use std::fs::File;
use std::io::Write;
use std::sync::Mutex;
use tauri::async_runtime::{spawn, spawn_blocking};
use tauri::command;
use tauri::Emitter;
use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};

struct FtpCredentials {
    address: String,
    username: String,
    password: String,
    current_path: String,
}

lazy_static! {
    // Safe, global, mutable FTP stream wrapped in a Mutex
    static ref FTP_STREAM: Mutex<Option<FtpStream>> = Mutex::new(None);
    static ref FTP_CREDENTIALS: Mutex<Option<FtpCredentials>> = Mutex::new(None);
}

#[tauri::command]
fn disconnect_ftp_server() -> Result<String, String> {
    // Lock the FTP_STREAM Mutex to get safe access to the Option<FtpStream>
    let mut ftp_stream = FTP_STREAM
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // Attempt to disconnect if there is an existing connection
    match ftp_stream.take() {
        Some(mut stream) => match stream.quit() {
            Ok(_) => Ok("Successfully disconnected.".to_string()),
            Err(e) => Err(format!("Failed to disconnect: {}", e)),
        },
        None => Err("No connection to disconnect.".to_string()),
    }
}

#[tauri::command]
async fn connect_ftp_server(
    address: &str,
    username: &str,
    password: &str,
) -> Result<Vec<serde_json::Value>, String> {
    let result = spawn_blocking(move || {
        let mut ftp_stream = FTP_STREAM
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;

        *ftp_stream = match FtpStream::connect(address) {
            Ok(stream) => Some(stream),
            Err(e) => return Err(format!("Failed to connect: {}", e)),
        };

        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

        if let Err(e) = ftp_stream.login(username, password) {
            return Err(format!("Failed to login: {}", e));
        }

        // ✅ Get initial directory (if supported)
        let current_path = ftp_stream.pwd().unwrap_or_else(|_| "/".to_string());

        // ✅ Save credentials + initial path
        let mut credentials = FTP_CREDENTIALS.lock().unwrap();
        *credentials = Some(FtpCredentials {
            address: address.to_string(),
            username: username.to_string(),
            password: password.to_string(),
            current_path,
        });

        list_files(ftp_stream)
    })
    .await
    .map_err(|e| format!("Failed to connect: {}", e))?
}

#[tauri::command]
async fn change_directory(directory: String) -> Result<Vec<Value>, Vec<Value>> {
    let result = spawn_blocking(move || {
        // Acquire lock on the FTP_STREAM
        let mut ftp_stream = FTP_STREAM
            .lock()
            .map_err(|e| vec![json!({ "error": e.to_string() })])?;

        // Ensure there is an active FTP connection
        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| vec![json!({ "error": "Failed to establish FTP stream" })])?;

        // Attempt to change directory
        match ftp_stream.cwd(&directory) {
            Ok(_) => {
                // ✅ Update the stored path
                let mut credentials = FTP_CREDENTIALS.lock().unwrap();
                if let Some(creds) = credentials.as_mut() {
                    creds.current_path = directory.to_string();
                }

                match list_files(ftp_stream) {
                    Ok(list) => Ok(list),
                    Err(e) => Err(vec![json!({ "error": e })]),
                }
            }
            Err(ref e)
                if e.to_string()
                    .contains("Expected code [250], got response: 200 OK") =>
            {
                list_files(ftp_stream).map_err(|e| vec![json!({ "error": e })])
            }
            Err(e) => Err(vec![json!({ "error": e.to_string() })]),
        }
    })
    .await;

    // Properly unwrap the `Result<Result<..>>`
    match result {
        Ok(inner_result) => inner_result, // Unwrap inner `Result<Vec<Value>, Vec<Value>>`
        Err(e) => Err(vec![json!({ "error": format!("Task failed: {}", e) })]), // Handle JoinError
    }
}

#[command]
async fn download_file(file_name: String, to_path: String) -> Result<String, String> {
    spawn_blocking(move || {
        // ✅ Retrieve saved credentials
        let credentials = FTP_CREDENTIALS.lock().unwrap();
        let credentials = credentials
            .as_ref()
            .ok_or("Not connected to any FTP server")?;

        // ✅ Create a new FTP connection using stored credentials
        let mut ftp_stream = FtpStream::connect(&credentials.address)
            .map_err(|e| format!("Failed to connect: {}", e))?;

        // ✅ Attempt to login
        ftp_stream
            .login(&credentials.username, &credentials.password)
            .map_err(|e| format!("Login failed: {}", e))?;

        // ✅ Change to the stored directory before downloading
        match ftp_stream.cwd(&credentials.current_path) {
            Ok(_) => {} // Successfully changed directory
            Err(e) => {
                let error_msg = e.to_string();
                if error_msg.contains("Expected code [250], got response: 200 OK") {
                    // ✅ Ignore incorrect 200 OK response and continue
                } else {
                    return Err(format!("Failed to change directory: {}", error_msg));
                }
            }
        }

        // ✅ Retrieve the file and save it
        ftp_stream
            .retr(&file_name, |stream| {
                let mut file = File::create(&to_path).map_err(FtpError::ConnectionError)?;
                let mut buffer = Vec::new();
                stream
                    .read_to_end(&mut buffer)
                    .map_err(FtpError::ConnectionError)?;
                file.write_all(&buffer).map_err(FtpError::ConnectionError)?;
                Ok(())
            })
            .map_err(|e| {
                format!(
                    "FTP download error: {} - Path: {path}",
                    e,
                    path = &credentials.current_path
                )
            })?;

        ftp_stream.quit().ok(); // Close the connection gracefully

        Ok(format!("File downloaded successfully to {}", to_path))
    })
    .await
    .map_err(|e| format!("Failed to run task: {}", e))?
}

#[tauri::command]
async fn delete_files(file_names: Vec<String>) -> Result<Vec<serde_json::Value>, String> {
    spawn_blocking(move || {
        // Acquire lock on the FTP_STREAM to get safe access to Option<FtpStream>
        let mut ftp_stream = FTP_STREAM
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;

        // Attempt to connect if there is no existing connection
        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

        // Delete each file
        for file_name in file_names {
            delete_file(ftp_stream, file_name)
                .map_err(|e| format!("Error deleting file: {}", e))?;
        }

        // Return the list of files
        list_files(ftp_stream)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
async fn refresh_files() -> Result<Vec<serde_json::Value>, String> {
    spawn_blocking(move || {
        // Acquire lock on the FTP_STREAM to get safe access to Option<FtpStream>
        let mut ftp_stream = FTP_STREAM
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;

        // Attempt to connect if there is no existing connection
        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

        // Return the list of files
        list_files(ftp_stream)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

fn delete_file(stream: &mut FtpStream, file_name: String) -> Result<(), String> {
    // Attempt to delete the file
    match stream.rm(file_name.as_str()) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to delete file: {}", e)),
    }
}

fn list_files(stream: &mut FtpStream) -> Result<Vec<serde_json::Value>, String> {
    // Attempt to list files
    match stream.list(None) {
        Ok(list) => {
            let result = list
                .iter()
                .map(|line| {
                    let mut parts = line.split_whitespace();

                    // Parse components of the file details
                    let permissions = parts.next().unwrap_or_default();
                    let owner = parts.next().unwrap_or_default();
                    let group = parts.next().unwrap_or_default();
                    let _group = parts.next().unwrap_or_default(); // Additional group info (can be ignored)
                    let size = parts
                        .next()
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(0);

                    // Parse date components (month, day, year)
                    let month_str = parts.next().unwrap_or_default();
                    let day = parts
                        .next()
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(1);
                    let year_str = parts.next().unwrap_or_default();

                    // Correctly parse the year (fallback to "1970" if year is malformed)
                    let year = match year_str.len() {
                        4 => year_str.to_string(), // 4-digit year (e.g., "2023")
                        _ => "1970".to_string(),   // Default to 1970 if year parsing fails
                    };

                    // Convert month name to a numeric value (e.g., "Jul" to 7)
                    let month = match month_str {
                        "Jan" => 1,
                        "Feb" => 2,
                        "Mar" => 3,
                        "Apr" => 4,
                        "May" => 5,
                        "Jun" => 6,
                        "Jul" => 7,
                        "Aug" => 8,
                        "Sep" => 9,
                        "Oct" => 10,
                        "Nov" => 11,
                        "Dec" => 12,
                        _ => 1, // Default to January if month parsing fails
                    };

                    // Construct a date (ensure proper date format)
                    let date = NaiveDate::from_ymd_opt(year.parse().unwrap_or(1970), month, day)
                        .map(|d| d.format("%Y-%m-%d").to_string())
                        .unwrap_or_else(|| "1970-01-01".to_string());

                    // File name is the remainder of the parts after the date components
                    let file_name = parts.collect::<Vec<&str>>().join(" ");

                    // Check if it's a directory
                    let file_type = if permissions.starts_with('d') {
                        "directory".to_string() // Directory
                    } else {
                        // If it's not a directory, extract the file extension
                        file_name
                            .rsplit_once('.')
                            .map(|(_, ext)| ext.to_lowercase())
                            .unwrap_or_else(|| "".to_string())
                    };

                    // Return the tuple: file name (for sorting) and a JSON object with parsed information
                    (
                        file_name.clone(), // File name for sorting alphabetically
                        json!({
                            "line": line,
                            "file_type": file_type,
                            "permissions": permissions,
                            "owner": owner,
                            "group": group,
                            "size": size,
                            "date": date,
                            "file_name": file_name,
                        }),
                    )
                })
                .collect::<Vec<(String, serde_json::Value)>>();

            // Sort the result by file name in alphabetical order
            // result.sort_by(|a, b| a.0.cmp(&b.0));

            // Extract just the JSON objects after sorting by name
            // let sorted_result = result.into_iter().map(|(_, json)| json).collect::<Vec<_>>();

            // Ok(sorted_result)

            // Remove this
            let result = result.into_iter().map(|(_, json)| json).collect::<Vec<_>>();
            // result.insert(
            //     0,
            //     json!({
            //         "line": "",
            //         "file_type": "directory",
            //         "permissions": "drwxr-xr-x",
            //         "owner": "root",
            //         "group": "root",
            //         "size": 0,
            //         "date": "1970-01-01",
            //         "file_name": "..",
            //     }),
            // );
            Ok(result)
        }
        Err(e) => Err(format!("Failed to list files: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::POSITION | StateFlags::SIZE)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            connect_ftp_server,
            change_directory,
            disconnect_ftp_server,
            refresh_files,
            delete_files,
            download_file
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            // app.handle().save_window_state()
            app.handle()
                .save_window_state(StateFlags::POSITION | StateFlags::SIZE)
                .unwrap();

            window.open_devtools();

            let _ = window.set_decorations(false);
            let _ = window.set_shadow(false);
            let _ = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .inner_size(750.0, 900.0);

            let _ = window
                .set_size(tauri::Size::Logical(tauri::LogicalSize {
                    width: 100.0,
                    height: 100.0,
                }))
                .unwrap();

            // #[cfg(target_os = "macos")]
            // window.set_transparent_titlebar(true, true);

            match window.restore_state(StateFlags::POSITION | StateFlags::SIZE) {
                Ok(_) => Ok(()),
                Err(e) => Err(e.into()),
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
