use chrono::NaiveDate;
use ftp::FtpStream;
use lazy_static::lazy_static;
use serde_json::json;
use std::sync::Mutex;
use tauri::Manager;

lazy_static! {
    // Safe, global, mutable FTP stream wrapped in a Mutex
    static ref FTP_STREAM: Mutex<Option<FtpStream>> = Mutex::new(None);
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
fn connect_ftp_server(
    address: &str,
    username: &str,
    password: &str,
) -> Result<Vec<serde_json::Value>, String> {
    // Acquire lock on the FTP_STREAM to get safe access to Option<FtpStream>
    let mut ftp_stream = FTP_STREAM
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // Attempt to connect if there is no existing connection
    *ftp_stream = match FtpStream::connect(address) {
        Ok(stream) => Some(stream),
        Err(e) => return Err(format!("Failed to connect: {}", e)),
    };

    // Attempt to login to the FTP server
    let ftp_stream = ftp_stream
        .as_mut()
        .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

    // Perform the login
    if let Err(e) = ftp_stream.login(username, password) {
        // No need to clear the FTP connection here
        return Err(format!("Failed to login: {}", e));
    }

    // Successfully connected and logged in; now call list_files
    list_files(ftp_stream)
}

use serde_json::Value;

#[tauri::command]
fn change_directory(directory: &str) -> Result<Vec<Value>, Vec<Value>> {
    // Acquire lock on the FTP_STREAM to get safe access to Option<FtpStream>
    let mut ftp_stream = FTP_STREAM
        .lock()
        .map_err(|e| vec![json!({ "error": e.to_string() })])?;

    // Attempt to connect if there is no existing connection
    let ftp_stream = ftp_stream
        .as_mut()
        .ok_or_else(|| vec![json!({ "error": "Failed to establish FTP stream".to_string() })])?;

    // Attempt to change directory
    match ftp_stream.cwd(directory) {
        Ok(_) => match list_files(ftp_stream) {
            Ok(list) => Ok(list),                       // Return the list of files as Ok
            Err(e) => Err(vec![json!({ "error": e })]), // Wrap the error in a Vec<serde_json::Value>
        },
        Err(e) => {
            if e.to_string()
                .contains("Expected code [250], got response: 200 OK")
            {
                match list_files(ftp_stream) {
                    Ok(list) => Ok(list),                       // Return the list of files as Ok
                    Err(e) => Err(vec![json!({ "error": e })]), // Wrap the error in a Vec<serde_json::Value>
                }
            } else {
                Err(vec![json!({ "error": e.to_string() })])
            }
        } // Return error if cwd fails
    }
}

#[tauri::command]
fn go_up_directory() -> Result<Vec<serde_json::Value>, String> {
    // Acquire lock on the FTP_STREAM to get safe access to Option<FtpStream>
    let mut ftp_stream = FTP_STREAM
        .lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;

    // Attempt to connect if there is no existing connection
    let ftp_stream = ftp_stream
        .as_mut()
        .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

    // Attempt to change directory
    match ftp_stream.cdup() {
        Ok(_) => list_files(ftp_stream),
        Err(e) => Err(format!("Failed to go up directory: {}", e)),
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
                        "directory" // Directory
                    } else {
                        // If it's not a directory, extract the file extension
                        if let Some(extension) = file_name.split('.').last() {
                            extension // Return the file extension
                        } else {
                            "unknown file" // If there's no extension
                        }
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
// use tauri::Manager;
// use window_vibrancy::{apply_mica, clear_mica};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            connect_ftp_server,
            change_directory,
            disconnect_ftp_server,
            go_up_directory
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();

            // app.handle().save_window_state()
            app.handle().save_window_state(StateFlags::all()).unwrap();

            window.open_devtools();

            // #[cfg(target_os = "macos")]
            // window.set_transparent_titlebar(true, true);

            match window.restore_state(StateFlags::all()) {
                Ok(_) => Ok(()),
                Err(e) => Err(e.into()),
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
