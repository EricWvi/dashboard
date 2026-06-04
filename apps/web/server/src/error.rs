use thiserror::Error;

/// Errors that can occur during server bootstrap.
#[derive(Debug, Error)]
pub enum WebBootstrapError {
    #[error("DASHBOARD_MINIO_ENDPOINT is required and must not be empty")]
    MinioEndpointEmpty,

    #[error("DASHBOARD_MINIO_BUCKET is required and must not be empty")]
    MinioBucketEmpty,

    #[error("DASHBOARD_MINIO_ACCESS_KEY_ID is required and must not be empty")]
    MinioAccessKeyIdEmpty,

    #[error("DASHBOARD_MINIO_SECRET_KEY is required and must not be empty")]
    MinioSecretKeyEmpty,

    #[error("invalid DASHBOARD_MINIO_USE_SSL value {value:?}: expected 'true' or 'false'")]
    MinioUseSslInvalid { value: String },

    #[error("invalid DASHBOARD_MINIO_PRESIGN_EXPIRY value {value:?}: {source}")]
    MinioPresignExpiryInvalid {
        value: String,
        source: humantime::DurationError,
    },

    #[error("database bootstrap failed: {0}")]
    Database(#[from] only_db_server::DatabaseError),

    #[error("MinIO client init failed: {0}")]
    MinioInit(#[from] only_infrastructure::MinioInitError),

    #[error("scheduler error: {0}")]
    Scheduler(#[from] only_scheduler::SchedulerError),
}
