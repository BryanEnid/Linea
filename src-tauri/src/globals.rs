use crate::models::FtpCredentials;
use ftp::FtpStream;
use lazy_static::lazy_static;
use serde_json::{json, Value};
use std::sync::Mutex;

lazy_static! {
    // Static Mutex
    pub static ref FTP_STREAM: Mutex<Option<FtpStream>> = Mutex::new(None);
    pub static ref FTP_CREDENTIALS: Mutex<Option<FtpCredentials>> = Mutex::new(None);
}
