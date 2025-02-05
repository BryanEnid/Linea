use crate::globals::*;
use chrono::NaiveDate;
use ftp::FtpStream;
use serde_json::json;

pub fn delete_file(stream: &mut FtpStream, file_name: String) -> Result<(), String> {
    // Attempt to delete the file
    match stream.rm(file_name.as_str()) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to delete file: {}", e)),
    }
}

struct FileDetails {
    name: String,
}

pub fn list_files(stream: &mut FtpStream) -> Result<Vec<serde_json::Value>, String> {
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

            let result = result.into_iter().map(|(_, json)| json).collect::<Vec<_>>();
            Ok(result)
        }
        Err(e) => Err(format!("Failed to list files: {}", e)),
    }
}

pub fn update_stored_path(new_dir: &str) {
    let mut credentials = FTP_CREDENTIALS.lock().unwrap();
    if let Some(creds) = credentials.as_mut() {
        if new_dir == ".." {
            // If going back, remove the last folder
            if let Some(pos) = creds.current_path.rfind('/') {
                creds.current_path = creds.current_path[..pos].to_string();
            }
            if creds.current_path.is_empty() {
                creds.current_path = "/".to_string();
            }
        } else {
            // Append new directory properly
            if creds.current_path == "/" {
                creds.current_path = format!("/{}", new_dir);
            } else {
                creds.current_path = format!("{}/{}", creds.current_path, new_dir);
            }
        }
    }
}
