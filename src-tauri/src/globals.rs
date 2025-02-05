use crate::models::FtpCredentials;
use ftp::FtpStream;
use lazy_static::lazy_static;
use serde_json::{json, Value};
use std::sync::Mutex;

lazy_static! {
    // Static Mutex
    pub static ref FTP_STREAM: Mutex<Option<FtpStream>> = Mutex::new(None);
    pub static ref FTP_CREDENTIALS: Mutex<Option<FtpCredentials>> = Mutex::new(None);

    // Static empty objects
    pub static ref EMPTY_OBJECT: Value = json!({});
    pub static ref EMPTY_ARRAY: Value = json!([]);
}

/// Returns the empty object `Value`.
pub fn empty_object() -> &'static Value {
    &EMPTY_OBJECT
}

/// Returns the empty array `Value`.
pub fn empty_array() -> &'static Value {
    &EMPTY_ARRAY
}
