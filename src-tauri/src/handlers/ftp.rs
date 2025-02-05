use crate::globals::*;
use crate::models::FtpCredentials;
use crate::utils::{delete_file, list_files, update_stored_path};
use ftp::FtpError;
use ftp::FtpStream;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs::File;
use std::io::Write;
use tauri::async_runtime::spawn_blocking;
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: T,
}

type FileListResult = Vec<Value>;

fn success_response<T>(message: &str, data: Value) -> ApiResponse<T> {
    ApiResponse {
        success: true,
        message: message.to_string(),
        data,
    }
}

fn error_response<T>(message: &str, data: T) -> Result<ApiResponse<T>, ApiResponse<T>> {
    Ok(ApiResponse {
        success: false,
        message: message.to_string(),
        data,
    })
}

#[command]
pub async fn connect_ftp_server(
    address: &str,
    username: &str,
    password: &str,
) -> Result<ApiResponse<FileListResult>, ApiResponse<FileListResult>> {
    let address = address.to_string();
    let username = username.to_string();
    let password = password.to_string();

    let result = spawn_blocking(move || {
        let mut ftp_stream = FTP_STREAM
            .lock()
            .map_err(|e| format!("Failed to acquire lock: {}", e))?;

        *ftp_stream = match FtpStream::connect(&address) {
            Ok(stream) => Some(stream),
            Err(e) => return Err(format!("Failed to connect: {}", e)),
        };

        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

        if let Err(e) = ftp_stream.login(&username, &password) {
            return Err(format!("Failed to login: {}", e));
        }

        // ✅ Get initial directory (if supported)
        let current_path = ftp_stream.pwd().unwrap_or_else(|_| "/".to_string());

        // ✅ Save credentials + initial path
        let mut credentials = FTP_CREDENTIALS.lock().unwrap();
        *credentials = Some(FtpCredentials {
            address,
            username,
            password,
            current_path,
        });

        list_files(ftp_stream)
    })
    .await;

    match result {
        Ok(files) => Ok(success_response("Successfully connected.", files)),
        Err(e) => Ok(error_response(&e.to_string(), json!([]))),
    }
}

#[command]
pub fn disconnect_ftp_server() -> ApiResponse<()> {
    // Lock the FTP_STREAM Mutex to get safe access to the Option<FtpStream>
    let mut ftp_stream = match FTP_STREAM.lock() {
        Ok(stream) => stream,
        Err(e) => error_response(format!("Failed to acquire lock: {}", e), data),
    };

    // Attempt to disconnect if there is an existing connection
    match ftp_stream.take() {
        Some(mut stream) => match stream.quit() {
            Ok(_) => ApiResponse {
                success: true,
                message: "Successfully disconnected.".to_string(),
                data: empty_object().clone(),
            },
            Err(e) => ApiResponse {
                success: false,
                message: format!("Failed to disconnect: {}", e),
                data: empty_object().clone(),
            },
        },
        None => ApiResponse {
            success: false,
            message: "No active FTP connection".to_string(),
            data: empty_object().clone(),
        },
    }
}

#[command]
pub async fn download_file(file_name: String, to_path: String) -> ApiResponse<()> {
    let result = spawn_blocking(move || {
        let creds_lock = FTP_CREDENTIALS.try_lock();
        if creds_lock.is_err() {
            return ApiResponse {
                success: false,
                message: "FTP_CREDENTIALS lock is busy".to_string(),
                data: empty_object().clone(),
            };
        }

        let creds = creds_lock.unwrap();
        if creds.is_none() {
            return ApiResponse {
                success: false,
                message: "No stored credentials".to_string(),
                data: empty_object().clone(),
            };
        }

        let credentials = creds.as_ref().unwrap().clone();
        let current_path = credentials.current_path.clone();
        drop(creds); // Release the lock

        let mut ftp_stream = match FtpStream::connect(&credentials.address) {
            Ok(stream) => stream,
            Err(e) => {
                return ApiResponse {
                    success: false,
                    message: format!("Failed to connect: {}", e),
                    data: empty_object().clone(),
                };
            }
        };

        if let Err(e) = ftp_stream.login(&credentials.username, &credentials.password) {
            return ApiResponse {
                success: false,
                message: format!("Login failed: {}", e),
                data: empty_object().clone(),
            };
        }

        // Change directory before downloading
        if let Err(e) = ftp_stream.cwd(&current_path) {
            let error_msg = e.to_string();
            if !error_msg.contains("Expected code [250], got response: 200 OK") {
                return ApiResponse {
                    success: false,
                    message: format!("Failed to change directory: {}", error_msg),
                    data: empty_object().clone(),
                };
            }
        }

        // Retrieve the file and save it
        let download_result = ftp_stream.retr(&file_name, |stream| {
            let mut file = File::create(&to_path).map_err(FtpError::ConnectionError)?;
            let mut buffer = Vec::new();
            stream
                .read_to_end(&mut buffer)
                .map_err(FtpError::ConnectionError)?;
            file.write_all(&buffer).map_err(FtpError::ConnectionError)?;
            Ok(())
        });

        if let Err(e) = download_result {
            return ApiResponse {
                success: false,
                message: format!("FTP download error: {} - Path: {}", e, current_path),
                data: empty_object().clone(),
            };
        }

        ftp_stream.quit().ok();

        ApiResponse {
            success: true,
            message: format!("File downloaded successfully to {}", to_path),
            data: empty_object().clone(),
        }
    })
    .await;

    // Handle any potential spawn_blocking errors
    match result {
        Ok(response) => response,
        Err(e) => ApiResponse {
            success: false,
            message: format!("Failed to run task: {}", e),
            data: empty_object().clone(),
        },
    }
}

#[command]
pub async fn delete_files(file_names: Vec<String>) -> FileListResult {
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

#[command]
pub async fn refresh_files() -> FileListResult {
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

#[command]
pub async fn change_directory(directory: String) -> FileListResult {
    spawn_blocking(move || {
        // Acquire lock on the FTP_STREAM
        let mut ftp_stream = FTP_STREAM.lock().map_err(|e| e.to_string())?;

        // Ensure there is an active FTP connection
        let ftp_stream = ftp_stream
            .as_mut()
            .ok_or_else(|| "Failed to establish FTP stream".to_string())?;

        // Attempt to change directory
        match ftp_stream.cwd(&directory) {
            Ok(_) => {
                update_stored_path(&directory);
                list_files(ftp_stream)
            }
            Err(ref e)
                if e.to_string()
                    .contains("Expected code [250], got response: 200 OK") =>
            {
                update_stored_path(&directory);
                list_files(ftp_stream)
            }

            Err(e) => Err(format!("Failed to change directory: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}
