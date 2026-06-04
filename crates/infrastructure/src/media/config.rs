/// Configuration for connecting to a MinIO-compatible object store.
pub struct MinioConfig {
    pub endpoint: String,
    pub bucket: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    /// When `true`, connections use HTTPS; `false` uses plain HTTP.
    pub use_ssl: bool,
    /// How long presigned URLs remain valid.
    pub presign_expiry: std::time::Duration,
}
