use std::path::Path;

use only_logging::{only_error, only_info};
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;

use crate::{DatabaseError, MigrationCatalog, TimestampSource, migration};

/// Thread-safe SQLite connection pool with WAL-mode pragmas applied on every new connection.
#[derive(Clone, Debug)]
pub struct RepositoryPool {
    pool: Pool<SqliteConnectionManager>,
}

impl RepositoryPool {
    /// Builds an 8-connection WAL-mode pool backed by a file at the given path.
    pub fn new(path: &Path) -> Result<Self, DatabaseError> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "busy_timeout", "5000")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        let pool = Pool::builder().max_size(8).build(manager)?;
        Ok(Self { pool })
    }

    /// Builds a single-connection in-memory pool for tests.
    /// max_size=1 ensures all operations share the same SQLite connection state.
    pub fn in_memory() -> Result<Self, DatabaseError> {
        let manager = SqliteConnectionManager::memory().with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        let pool = Pool::builder().max_size(1).build(manager)?;
        Ok(Self { pool })
    }

    /// Reconciles the schema to the catalog's target prefix, applying or rolling back migrations as needed.
    pub fn bootstrap<T: TimestampSource>(
        &self,
        catalog: &MigrationCatalog,
        timestamp_source: &T,
    ) -> Result<(), DatabaseError> {
        only_info!(
            message = "running database bootstrap",
            operation = "database_bootstrap"
        );

        let result = self
            .with_connection(|conn| migration::reconcile_database(conn, catalog, timestamp_source));

        match &result {
            Ok(()) => only_info!(
                message = "database bootstrap complete",
                operation = "database_bootstrap"
            ),
            Err(error) => only_error!(
                message = "database bootstrap failed",
                operation = "database_bootstrap",
                error.kind = "database_bootstrap",
                error.message = error.to_string()
            ),
        }

        result
    }

    /// Runs a closure with an exclusive mutable connection from the pool.
    pub fn with_connection<R>(
        &self,
        f: impl FnOnce(&mut Connection) -> Result<R, DatabaseError>,
    ) -> Result<R, DatabaseError> {
        let mut conn = self.pool.get()?;
        f(&mut conn)
    }
}
