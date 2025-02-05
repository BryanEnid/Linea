#[derive(Clone, Debug)] // Add Debug for easier logging
pub struct FtpCredentials {
    pub address: String,
    pub username: String,
    pub password: String,
    pub current_path: String,
}
