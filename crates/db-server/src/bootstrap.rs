use only_logging::{only_error, only_info};
use sqlx::{Pool, Postgres};

use crate::{
    DatabaseError, DatabaseLocation, MigrationCatalog, SystemTimestampSource, TimestampSource,
    migration,
};

/// Owns a PostgreSQL connection pool that has already been reconciled with the active migration target.
#[derive(Debug, Clone)]
pub struct Database {
    pool: Pool<Postgres>,
}

impl Database {
    /// Exposes the managed connection pool for query and repository work.
    pub fn pool(&self) -> &Pool<Postgres> {
        &self.pool
    }

    /// Transfers ownership of the managed pool to callers that need direct control.
    pub fn into_pool(self) -> Pool<Postgres> {
        self.pool
    }
}

/// Coordinates opening PostgreSQL connection pools and reconciling them with the migration catalog.
#[derive(Debug)]
pub struct DatabaseBootstrapper<T> {
    timestamp_source: T,
}

impl DatabaseBootstrapper<SystemTimestampSource> {
    /// Builds a bootstrapper that timestamps applied migrations from the system clock.
    pub fn system() -> Self {
        Self::new(SystemTimestampSource)
    }
}

impl<T> DatabaseBootstrapper<T>
where
    T: TimestampSource,
{
    /// Builds a bootstrapper around a caller-provided timestamp source for deterministic tests.
    pub fn new(timestamp_source: T) -> Self {
        Self { timestamp_source }
    }

    /// Opens a connection pool, reconciles it with the target migration prefix, and returns the ready database.
    pub async fn bootstrap(
        &self,
        location: &DatabaseLocation,
        catalog: &MigrationCatalog,
    ) -> Result<Database, DatabaseError> {
        only_info!(
            message = "opening database pool",
            operation = "database_open"
        );

        let pool = match Pool::<Postgres>::connect(location.connection_string()).await {
            Ok(pool) => pool,
            Err(error) => {
                only_error!(
                    message = "failed to open database pool",
                    operation = "database_open",
                    error.kind = "database_open",
                    error.message = error.to_string()
                );
                return Err(DatabaseError::Sqlx(error));
            }
        };

        only_info!(
            message = "opened database pool",
            operation = "database_open"
        );

        if let Err(error) =
            migration::reconcile_database(&pool, catalog, &self.timestamp_source).await
        {
            only_error!(
                message = "database bootstrap failed",
                operation = "database_bootstrap",
                error.kind = "database_bootstrap",
                error.message = error.to_string()
            );
            return Err(error);
        }

        only_info!(
            message = "database bootstrap complete",
            operation = "database_bootstrap"
        );

        Ok(Database { pool })
    }
}
