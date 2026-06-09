use std::collections::BTreeMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use only_logging::{with_recorded_trace_logging, with_trace_logging};
use pretty_assertions::assert_eq;
use rusqlite::{Connection, params};
use tempfile::TempDir;
use tracing_subscriber::layer::{Context, Layer};
use tracing_subscriber::registry::LookupSpan;

use crate::{
    AppliedMigration, DatabaseError, Migration, MigrationCatalog, MigrationDirection,
    RepositoryPool, SystemTimestampSource, TimestampSource,
};

/// Produces deterministic timestamps so migration bookkeeping tests can assert full records.
#[derive(Clone, Copy, Debug)]
struct FixedTimestampSource {
    now: i64,
}

impl TimestampSource for FixedTimestampSource {
    fn current_timestamp_millis(&self) -> i64 {
        self.now
    }
}

/// Verifies a fresh in-memory bootstrap applies the catalog and records migration timestamps.
#[test]
fn bootstraps_empty_database_with_inline_catalog() {
    let pool = RepositoryPool::in_memory().unwrap();
    with_trace_logging(|| {
        pool.bootstrap(
            &MigrationCatalog::new(vec![create_table_migration("0001", "alpha")]).unwrap(),
            &FixedTimestampSource {
                now: 1_700_000_000_000,
            },
        )
        .unwrap()
    });

    pool.with_connection(|conn| {
        assert_eq!(table_exists(conn, "alpha"), true);
        assert_eq!(
            load_applied_migrations(conn),
            vec![AppliedMigration::new("0001", 1_700_000_000_000)]
        );
        Ok(())
    })
    .unwrap();
}

/// Verifies the runner applies only the missing tail of a linear migration history in ascending order.
#[test]
fn applies_missing_migrations_in_ascending_order() {
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("upgrade.sqlite3");

    bootstrap_file_database(
        &database_path,
        test_catalog_with_target_prefix(1).unwrap(),
        100,
    );
    bootstrap_file_database(&database_path, test_catalog().unwrap(), 200);

    let pool = RepositoryPool::new(&database_path).unwrap();
    pool.with_connection(|conn| {
        assert_eq!(
            load_applied_migrations(conn),
            vec![
                AppliedMigration::new("0001", 100),
                AppliedMigration::new("0002", 200),
                AppliedMigration::new("0003", 200),
            ]
        );
        assert_eq!(table_exists(conn, "beta"), true);
        assert_eq!(table_exists(conn, "gamma"), true);
        Ok(())
    })
    .unwrap();
}

/// Verifies the runner rolls back extra targeted versions in descending order while preserving older records.
#[test]
fn rolls_back_extra_versions_in_descending_order() {
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("rollback.sqlite3");

    bootstrap_file_database(&database_path, test_catalog().unwrap(), 300);
    bootstrap_file_database(
        &database_path,
        test_catalog_with_target_prefix(2).unwrap(),
        400,
    );

    let pool = RepositoryPool::new(&database_path).unwrap();
    pool.with_connection(|conn| {
        assert_eq!(
            load_applied_migrations(conn),
            vec![
                AppliedMigration::new("0001", 300),
                AppliedMigration::new("0002", 300),
            ]
        );
        assert_eq!(table_exists(conn, "beta"), true);
        assert_eq!(table_exists(conn, "gamma"), false);
        Ok(())
    })
    .unwrap();
}

/// Verifies a mismatch inside the shared prefix fails fast instead of guessing at repair steps.
#[test]
fn rejects_diverged_history_in_shared_prefix() {
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("diverged.sqlite3");

    bootstrap_file_database(&database_path, diverged_catalog().unwrap(), 500);

    let pool = RepositoryPool::new(&database_path).unwrap();
    let error = with_trace_logging(|| {
        pool.bootstrap(&test_catalog().unwrap(), &FixedTimestampSource { now: 600 })
            .unwrap_err()
    });

    assert_eq!(
        match error {
            DatabaseError::DivergedMigrationHistory {
                position,
                expected,
                found,
            } => {
                Some((position, expected, found))
            }
            _ => None,
        },
        Some((1, "0002".to_string(), "0003".to_string()))
    );
}

/// Verifies a failing up step does not record the version whose SQL could not be installed.
#[test]
fn leaves_failed_up_migration_unrecorded() {
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("failed-up.sqlite3");

    bootstrap_file_database(
        &database_path,
        MigrationCatalog::new(vec![create_table_migration("0001", "alpha")]).unwrap(),
        700,
    );

    let pool = RepositoryPool::new(&database_path).unwrap();
    let error = with_trace_logging(|| {
        pool.bootstrap(
            &MigrationCatalog::new(vec![
                create_table_migration("0001", "alpha"),
                broken_up_migration("0002"),
            ])
            .unwrap(),
            &FixedTimestampSource { now: 800 },
        )
        .unwrap_err()
    });

    assert_migration_step_failed(&error, "0002", MigrationDirection::Up);

    pool.with_connection(|conn| {
        assert_eq!(
            load_applied_migrations(conn),
            vec![AppliedMigration::new("0001", 700)]
        );
        Ok(())
    })
    .unwrap();
}

/// Verifies a failing down step keeps the extra version recorded because the rollback never commits.
#[test]
fn leaves_failed_down_migration_recorded() {
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("failed-down.sqlite3");

    bootstrap_file_database(
        &database_path,
        MigrationCatalog::new(vec![
            create_table_migration("0001", "alpha"),
            broken_down_migration("0002"),
        ])
        .unwrap(),
        800,
    );

    let pool = RepositoryPool::new(&database_path).unwrap();
    let error = with_trace_logging(|| {
        pool.bootstrap(
            &MigrationCatalog::with_target_versions(
                vec![
                    create_table_migration("0001", "alpha"),
                    broken_down_migration("0002"),
                ],
                vec!["0001"],
            )
            .unwrap(),
            &FixedTimestampSource { now: 900 },
        )
        .unwrap_err()
    });

    assert_migration_step_failed(&error, "0002", MigrationDirection::Down);

    pool.with_connection(|conn| {
        assert_eq!(
            load_applied_migrations(conn),
            vec![
                AppliedMigration::new("0001", 800),
                AppliedMigration::new("0002", 800),
            ]
        );
        Ok(())
    })
    .unwrap();
}

/// Verifies bootstrap emits structured success and failure log events.
#[test]
fn emits_structured_bootstrap_and_migration_events() {
    let success_recorder = EventRecorder::default();
    with_recorded_trace_logging(success_recorder.layer(), || {
        RepositoryPool::in_memory()
            .unwrap()
            .bootstrap(
                &MigrationCatalog::new(vec![create_table_migration("0001", "alpha")]).unwrap(),
                &FixedTimestampSource { now: 42 },
            )
            .unwrap();
    });

    assert_eq!(
        success_recorder.events().into_iter().any(|event| {
            event_has_fields(
                &event,
                &[
                    ("message", "database bootstrap complete"),
                    ("operation", "database_bootstrap"),
                ],
            )
        }),
        true
    );

    let failure_recorder = EventRecorder::default();
    let temp_dir = TempDir::new().unwrap();
    let database_path = temp_dir.path().join("failed-up.sqlite3");

    with_recorded_trace_logging(failure_recorder.layer(), || {
        bootstrap_file_database(
            &database_path,
            MigrationCatalog::new(vec![create_table_migration("0001", "alpha")]).unwrap(),
            700,
        );
        let pool = RepositoryPool::new(&database_path).unwrap();
        let error = pool.bootstrap(
            &MigrationCatalog::new(vec![
                create_table_migration("0001", "alpha"),
                broken_up_migration("0002"),
            ])
            .unwrap(),
            &FixedTimestampSource { now: 800 },
        );

        assert_eq!(
            matches!(
                error,
                Err(DatabaseError::MigrationStepFailed {
                    ref version,
                    direction: MigrationDirection::Up,
                    ..
                }) if version == "0002"
            ),
            true
        );
    });

    assert_eq!(
        failure_recorder.events().into_iter().any(|event| {
            event_has_fields(
                &event,
                &[
                    ("direction", "up"),
                    ("error.kind", "migration_step_failed"),
                    ("message", "migration step failed"),
                    ("migration_version", "0002"),
                    ("operation", "migration_execute"),
                ],
            )
        }),
        true
    );
}

fn bootstrap_file_database(path: &Path, catalog: MigrationCatalog, now: i64) {
    with_trace_logging(|| {
        let pool = RepositoryPool::new(path).unwrap();
        pool.bootstrap(&catalog, &FixedTimestampSource { now })
            .unwrap();
    });
}

fn load_applied_migrations(connection: &Connection) -> Vec<AppliedMigration> {
    let mut statement = connection
        .prepare("SELECT version, executed_at FROM migrations ORDER BY version ASC")
        .unwrap();
    let rows = statement
        .query_map([], |row| {
            Ok(AppliedMigration::new(
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
            ))
        })
        .unwrap();

    rows.collect::<Result<Vec<_>, _>>().unwrap()
}

fn table_exists(connection: &Connection, table_name: &str) -> bool {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .unwrap()
        == 1
}

fn assert_migration_step_failed(
    error: &DatabaseError,
    expected_version: &str,
    expected_direction: MigrationDirection,
) {
    match error {
        DatabaseError::MigrationStepFailed {
            version,
            direction,
            source,
        } => {
            assert_eq!(version, expected_version);
            assert_eq!(direction, &expected_direction);
            assert_eq!(
                source.to_string().contains("near \"THIS\": syntax error"),
                true
            );
        }
        _ => panic!("expected migration step failure, got {error:?}"),
    }
}

fn test_catalog() -> Result<MigrationCatalog, DatabaseError> {
    MigrationCatalog::new(vec![
        create_table_migration("0001", "alpha"),
        create_table_migration("0002", "beta"),
        create_table_migration("0003", "gamma"),
    ])
}

fn test_catalog_with_target_prefix(
    prefix_length: usize,
) -> Result<MigrationCatalog, DatabaseError> {
    let migrations = vec![
        create_table_migration("0001", "alpha"),
        create_table_migration("0002", "beta"),
        create_table_migration("0003", "gamma"),
    ];
    let target_versions = migrations
        .iter()
        .take(prefix_length)
        .map(Migration::version)
        .collect();

    MigrationCatalog::with_target_versions(migrations, target_versions)
}

fn diverged_catalog() -> Result<MigrationCatalog, DatabaseError> {
    MigrationCatalog::new(vec![
        create_table_migration("0001", "alpha"),
        create_table_migration("0003", "gamma"),
    ])
}

fn create_table_migration(version: &'static str, table_name: &'static str) -> Migration {
    let up_sql =
        Box::leak(format!("CREATE TABLE {table_name} (id INTEGER PRIMARY KEY);").into_boxed_str());
    let down_sql = Box::leak(format!("DROP TABLE IF EXISTS {table_name};").into_boxed_str());
    let up_statements = Box::leak(vec![up_sql as &'static str].into_boxed_slice());
    let down_statements = Box::leak(vec![down_sql as &'static str].into_boxed_slice());

    Migration::new(version, up_statements, down_statements)
}

fn broken_up_migration(version: &'static str) -> Migration {
    Migration::new(
        version,
        &["THIS IS NOT VALID SQL"],
        &["DROP TABLE IF EXISTS broken_up;"],
    )
}

fn broken_down_migration(version: &'static str) -> Migration {
    Migration::new(
        version,
        &["CREATE TABLE broken_down (id INTEGER PRIMARY KEY);"],
        &["THIS IS NOT VALID SQL"],
    )
}

fn event_has_fields(event: &LoggedEvent, expected_fields: &[(&str, &str)]) -> bool {
    expected_fields.iter().all(|(field_name, expected_value)| {
        event.fields.get(*field_name).map(String::as_str) == Some(*expected_value)
    })
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct LoggedEvent {
    level: String,
    target: String,
    fields: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Default)]
struct EventRecorder {
    events: Arc<Mutex<Vec<LoggedEvent>>>,
}

impl EventRecorder {
    fn layer(&self) -> RecordingLayer {
        RecordingLayer {
            events: self.events.clone(),
        }
    }

    fn events(&self) -> Vec<LoggedEvent> {
        self.events.lock().unwrap().clone()
    }
}

#[derive(Clone, Debug)]
struct RecordingLayer {
    events: Arc<Mutex<Vec<LoggedEvent>>>,
}

impl<S> Layer<S> for RecordingLayer
where
    S: tracing::Subscriber + for<'lookup> LookupSpan<'lookup>,
{
    fn on_event(&self, event: &tracing::Event<'_>, _context: Context<'_, S>) {
        let mut visitor = EventFieldVisitor::default();
        event.record(&mut visitor);
        self.events.lock().unwrap().push(LoggedEvent {
            level: event.metadata().level().to_string(),
            target: event.metadata().target().to_string(),
            fields: visitor.fields,
        });
    }
}

#[derive(Debug, Default)]
struct EventFieldVisitor {
    fields: BTreeMap<String, String>,
}

impl tracing::field::Visit for EventFieldVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        self.fields
            .insert(field.name().to_string(), value.to_string());
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        self.fields
            .insert(field.name().to_string(), value.to_string());
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        self.fields
            .insert(field.name().to_string(), value.to_string());
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.fields.insert(
            field.name().to_string(),
            format!("{value:?}").trim_matches('"').to_string(),
        );
    }
}

// SystemTimestampSource smoke-check: verifies the system clock produces a positive non-zero value.
#[test]
fn system_timestamp_source_returns_positive_millis() {
    assert!(SystemTimestampSource.current_timestamp_millis() > 0);
}
