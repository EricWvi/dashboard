use thiserror::Error;

/// Errors that can occur during server bootstrap.
#[derive(Debug, Error)]
pub enum WebBootstrapError {
    #[error("DASHBOARD_DB_HOST is required and must not be empty")]
    DatabaseHostEmpty,

    #[error("DASHBOARD_DB_NAME is required and must not be empty")]
    DatabaseNameEmpty,

    #[error("DASHBOARD_DB_USERNAME is required and must not be empty")]
    DatabaseUsernameEmpty,

    #[error("DASHBOARD_DB_PASSWORD is required and must not be empty")]
    DatabasePasswordEmpty,

    #[error("invalid DASHBOARD_DB_PORT value {value:?}: expected a valid port number")]
    DatabasePortInvalid {
        value: String,
        #[source]
        source: std::num::ParseIntError,
    },

    #[error(
        "invalid DASHBOARD_LOG_LEVEL value {value:?}: expected 'debug', 'info', 'warn', or 'error'"
    )]
    LogLevelInvalid { value: String },

    #[error("logging initialization failed: {0}")]
    LoggingInit(#[from] only_logging::LoggingInitError),

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
