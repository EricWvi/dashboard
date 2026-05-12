use thiserror::Error;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    Up,
    Down,
}

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("connection pool error: {0}")]
    ConnectionPool(#[from] r2d2::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("migration versions must be unique, found duplicate version `{0}`")]
    DuplicateMigrationVersion(String),
    #[error("migration versions must be strictly increasing, found `{current}` after `{previous}`")]
    UnorderedMigrationVersions { previous: String, current: String },
    #[error(
        "target migration versions must match the catalog prefix at position {position}: expected `{expected}`, found `{found}`"
    )]
    InvalidTargetVersionPrefix {
        position: usize,
        expected: String,
        found: String,
    },
    #[error("database contains applied migration `{version}` that is not defined in the catalog")]
    UnknownAppliedMigrationVersion { version: String },
    #[error(
        "database migration history diverged at position {position}: expected `{expected}`, found `{found}`"
    )]
    DivergedMigrationHistory {
        position: usize,
        expected: String,
        found: String,
    },
    #[error("failed to execute migration `{version}` {direction:?}")]
    MigrationStepFailed {
        version: String,
        direction: MigrationDirection,
        #[source]
        source: rusqlite::Error,
    },
    #[error("pooled sqlite connections require a file-backed database location")]
    UnsupportedPooledLocation,
}
