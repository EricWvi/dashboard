use std::future::Future;

use crate::error::SyncError;

/// A single structural SQL migration identified by a monotonically-increasing version number.
pub struct Migration {
    pub version: u32,
    /// Raw SQL to execute when this migration is applied.
    pub sql: &'static str,
}

/// SQLite execution contract, implemented by the Android persistence layer.
///
/// Implementations are responsible for reading and persisting the current migration version
/// so the runner can determine which migrations remain pending.
pub trait MigrationExecutor: Send + Sync {
    /// Returns the version of the last successfully applied migration, or 0 if none.
    fn current_version(&self) -> impl Future<Output = Result<u32, SyncError>> + Send;

    /// Executes a single SQL statement within the SQLite database.
    fn execute_sql(&self, sql: &str) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Persists the version after a migration has been successfully applied.
    fn save_version(&self, version: u32) -> impl Future<Output = Result<(), SyncError>> + Send;
}

/// Applies pending structural migrations against the local SQLite database.
///
/// The catalog is a compile-time constant; migrations whose version exceeds the current
/// stored version are applied in ascending order. A failure stops the runner immediately
/// and returns the error so the Android layer can decide whether to halt or retry.
/// Migrations never trigger a full sync — they only adjust local schema structure.
pub struct MigrationRunner {
    migrations: &'static [Migration],
}

impl MigrationRunner {
    /// Creates a runner bound to a static migration catalog.
    pub const fn new(migrations: &'static [Migration]) -> Self {
        Self { migrations }
    }

    /// Applies any migrations with version > `current_version`, in ascending order.
    pub async fn run<E: MigrationExecutor>(&self, executor: &E) -> Result<(), SyncError> {
        let current = executor.current_version().await?;
        for migration in self.migrations {
            if migration.version > current {
                executor.execute_sql(migration.sql).await?;
                executor.save_version(migration.version).await?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used)]

    use std::sync::Mutex;

    use pretty_assertions::assert_eq;

    use super::*;
    use crate::error::SyncError;

    #[derive(Default)]
    struct MockExecutor {
        version: Mutex<u32>,
        executed_sql: Mutex<Vec<String>>,
        saved_versions: Mutex<Vec<u32>>,
        fail_sql: Mutex<Option<String>>,
    }

    impl MockExecutor {
        fn inject_sql_error(&self, sql: &str) {
            *self.fail_sql.lock().unwrap() = Some(sql.to_string());
        }
        fn executed_sql(&self) -> Vec<String> {
            self.executed_sql.lock().unwrap().clone()
        }
        fn saved_versions(&self) -> Vec<u32> {
            self.saved_versions.lock().unwrap().clone()
        }
    }

    impl MigrationExecutor for MockExecutor {
        fn current_version(&self) -> impl Future<Output = Result<u32, SyncError>> + Send {
            let v = *self.version.lock().unwrap();
            async move { Ok(v) }
        }

        fn execute_sql(&self, sql: &str) -> impl Future<Output = Result<(), SyncError>> + Send {
            let fail = self.fail_sql.lock().unwrap().clone();
            if fail.as_deref() == Some(sql) {
                return std::pin::Pin::from(Box::new(async {
                    Err(SyncError::Local("migration failed".to_string()))
                })
                    as Box<dyn Future<Output = Result<(), SyncError>> + Send>);
            }
            self.executed_sql.lock().unwrap().push(sql.to_string());
            std::pin::Pin::from(
                Box::new(async { Ok(()) }) as Box<dyn Future<Output = Result<(), SyncError>> + Send>,
            )
        }

        fn save_version(&self, version: u32) -> impl Future<Output = Result<(), SyncError>> + Send {
            *self.version.lock().unwrap() = version;
            self.saved_versions.lock().unwrap().push(version);
            async { Ok(()) }
        }
    }

    static MIGRATIONS: &[Migration] = &[
        Migration {
            version: 1,
            sql: "ALTER TABLE entries ADD COLUMN foo TEXT",
        },
        Migration {
            version: 2,
            sql: "ALTER TABLE tags ADD COLUMN bar INTEGER",
        },
        Migration {
            version: 3,
            sql: "ALTER TABLE tiptaps ADD COLUMN baz TEXT",
        },
    ];

    /// AM-01: new structural migration applied → SQL executed, version saved, data intact.
    #[tokio::test]
    async fn am_01_applies_pending_migrations() {
        let executor = MockExecutor::default();
        let runner = MigrationRunner::new(MIGRATIONS);

        runner.run(&executor).await.unwrap();

        assert_eq!(
            executor.executed_sql(),
            vec![
                "ALTER TABLE entries ADD COLUMN foo TEXT",
                "ALTER TABLE tags ADD COLUMN bar INTEGER",
                "ALTER TABLE tiptaps ADD COLUMN baz TEXT",
            ]
        );
        assert_eq!(executor.saved_versions(), vec![1, 2, 3]);
    }

    /// AM-01 variant: already at version 2 → only version 3 migration applied.
    #[tokio::test]
    async fn am_01_skips_already_applied_migrations() {
        let executor = MockExecutor::default();
        *executor.version.lock().unwrap() = 2;
        let runner = MigrationRunner::new(MIGRATIONS);

        runner.run(&executor).await.unwrap();

        assert_eq!(
            executor.executed_sql(),
            vec!["ALTER TABLE tiptaps ADD COLUMN baz TEXT"]
        );
        assert_eq!(executor.saved_versions(), vec![3]);
    }

    /// AM-02: migration SQL fails → error returned, subsequent migrations not applied.
    #[tokio::test]
    async fn am_02_sql_failure_stops_runner() {
        let executor = MockExecutor::default();
        executor.inject_sql_error("ALTER TABLE tags ADD COLUMN bar INTEGER");
        let runner = MigrationRunner::new(MIGRATIONS);

        let result = runner.run(&executor).await;

        assert!(result.is_err());
        // Only the first migration's SQL was executed before the failure.
        assert_eq!(
            executor.executed_sql(),
            vec!["ALTER TABLE entries ADD COLUMN foo TEXT"]
        );
        // Version saved for migration 1 only; migration 2 was not applied.
        assert_eq!(executor.saved_versions(), vec![1]);
    }
}
