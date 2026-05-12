use std::collections::BTreeMap;

use rusqlite::{Connection, Transaction, params};

use crate::{DatabaseError, MigrationDirection};

const CREATE_MIGRATIONS_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS migrations (
    version TEXT PRIMARY KEY,
    executed_at INTEGER NOT NULL
);
"#;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Migration {
    version: &'static str,
    up_statements: &'static [&'static str],
    down_statements: &'static [&'static str],
}

impl Migration {
    pub fn new(
        version: &'static str,
        up_statements: &'static [&'static str],
        down_statements: &'static [&'static str],
    ) -> Self {
        Self {
            version,
            up_statements,
            down_statements,
        }
    }

    pub fn version(&self) -> &'static str {
        self.version
    }

    pub fn up_statements(&self) -> &'static [&'static str] {
        self.up_statements
    }

    pub fn down_statements(&self) -> &'static [&'static str] {
        self.down_statements
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AppliedMigration {
    pub version: String,
    pub executed_at: i64,
}

impl AppliedMigration {
    pub fn new(version: String, executed_at: i64) -> Self {
        Self {
            version,
            executed_at,
        }
    }
}

#[derive(Clone, Debug)]
pub struct MigrationCatalog {
    migrations: Vec<Migration>,
    target_versions: Vec<&'static str>,
    migrations_by_version: BTreeMap<&'static str, usize>,
}

impl MigrationCatalog {
    pub fn new(migrations: Vec<Migration>) -> Result<Self, DatabaseError> {
        let target_versions = migrations.iter().map(Migration::version).collect();
        Self::with_target_versions(migrations, target_versions)
    }

    pub fn with_target_versions(
        migrations: Vec<Migration>,
        target_versions: Vec<&'static str>,
    ) -> Result<Self, DatabaseError> {
        validate_migration_order(&migrations)?;
        validate_target_prefix(&migrations, &target_versions)?;

        let migrations_by_version = migrations
            .iter()
            .enumerate()
            .map(|(index, migration)| (migration.version(), index))
            .collect();

        Ok(Self {
            migrations,
            target_versions,
            migrations_by_version,
        })
    }

    pub fn target_versions(&self) -> &[&'static str] {
        &self.target_versions
    }

    pub fn migration(&self, version: &str) -> Option<&Migration> {
        self.migrations_by_version
            .get(version)
            .map(|index| &self.migrations[*index])
    }
}

pub(crate) fn reconcile_database(
    connection: &mut Connection,
    catalog: &MigrationCatalog,
    executed_at: impl Fn() -> i64,
) -> Result<(), DatabaseError> {
    connection.execute_batch(CREATE_MIGRATIONS_TABLE_SQL)?;

    let applied_migrations = load_applied_migrations(connection)?;
    let target_versions = catalog.target_versions();
    let shared_prefix_length = applied_migrations.len().min(target_versions.len());

    for (position, (applied, expected)) in applied_migrations
        .iter()
        .zip(target_versions.iter())
        .take(shared_prefix_length)
        .enumerate()
    {
        if applied.version != *expected {
            return Err(DatabaseError::DivergedMigrationHistory {
                position,
                expected: (*expected).to_string(),
                found: applied.version.clone(),
            });
        }
    }

    if applied_migrations.len() > target_versions.len() {
        for applied_migration in applied_migrations.iter().skip(target_versions.len()).rev() {
            let migration = catalog
                .migration(&applied_migration.version)
                .ok_or_else(|| DatabaseError::UnknownAppliedMigrationVersion {
                    version: applied_migration.version.clone(),
                })?;

            execute_migration_step(
                connection,
                migration.version(),
                migration.down_statements(),
                MigrationDirection::Down,
                |transaction| {
                    transaction.execute(
                        "DELETE FROM migrations WHERE version = ?1",
                        params![migration.version()],
                    )?;
                    Ok(())
                },
            )?;
        }
    }

    if target_versions.len() > applied_migrations.len() {
        for target_version in target_versions.iter().skip(applied_migrations.len()) {
            let migration = catalog.migration(target_version).ok_or_else(|| {
                DatabaseError::UnknownAppliedMigrationVersion {
                    version: (*target_version).to_string(),
                }
            })?;

            execute_migration_step(
                connection,
                migration.version(),
                migration.up_statements(),
                MigrationDirection::Up,
                |transaction| {
                    transaction.execute(
                        "INSERT INTO migrations (version, executed_at) VALUES (?1, ?2)",
                        params![migration.version(), executed_at()],
                    )?;
                    Ok(())
                },
            )?;
        }
    }

    Ok(())
}

fn load_applied_migrations(
    connection: &Connection,
) -> Result<Vec<AppliedMigration>, DatabaseError> {
    let mut statement =
        connection.prepare("SELECT version, executed_at FROM migrations ORDER BY version ASC")?;
    let rows = statement.query_map([], |row| {
        Ok(AppliedMigration::new(
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
        ))
    })?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(DatabaseError::from)
}

fn execute_migration_step<F>(
    connection: &mut Connection,
    version: &str,
    statements: &[&str],
    direction: MigrationDirection,
    finalize: F,
) -> Result<(), DatabaseError>
where
    F: FnOnce(&Transaction<'_>) -> Result<(), rusqlite::Error>,
{
    let transaction = connection.transaction()?;

    for statement in statements {
        transaction.execute_batch(statement).map_err(|source| {
            DatabaseError::MigrationStepFailed {
                version: version.to_string(),
                direction,
                source,
            }
        })?;
    }

    finalize(&transaction).map_err(|source| DatabaseError::MigrationStepFailed {
        version: version.to_string(),
        direction,
        source,
    })?;

    transaction.commit()?;
    Ok(())
}

fn validate_migration_order(migrations: &[Migration]) -> Result<(), DatabaseError> {
    let mut previous_version = None;
    let mut seen_versions = BTreeMap::new();

    for migration in migrations {
        if seen_versions.insert(migration.version(), ()).is_some() {
            return Err(DatabaseError::DuplicateMigrationVersion(
                migration.version().to_string(),
            ));
        }

        if let Some(previous_version) = previous_version
            && migration.version() <= previous_version
        {
            return Err(DatabaseError::UnorderedMigrationVersions {
                previous: previous_version.to_string(),
                current: migration.version().to_string(),
            });
        }

        previous_version = Some(migration.version());
    }

    Ok(())
}

fn validate_target_prefix(
    migrations: &[Migration],
    target_versions: &[&'static str],
) -> Result<(), DatabaseError> {
    for (position, target_version) in target_versions.iter().enumerate() {
        let expected = migrations
            .get(position)
            .map(Migration::version)
            .unwrap_or_default();

        if target_version != &expected {
            return Err(DatabaseError::InvalidTargetVersionPrefix {
                position,
                expected: expected.to_string(),
                found: (*target_version).to_string(),
            });
        }
    }

    Ok(())
}
