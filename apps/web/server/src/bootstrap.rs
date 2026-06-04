use std::sync::Arc;

use only_application::RePresignExpiredMediaJob;
use only_db_server::{
    Database, DatabaseBootstrapper, DatabaseLocation, PostgresMediaRepository,
    SystemTimestampSource, default_migration_catalog,
};
use only_infrastructure::MinioObjectStore;
use only_scheduler::Job;
use only_scheduler::Scheduler;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;
use only_logging::only_info;

use crate::app_state::AppState;
use crate::config::MinioRuntimeConfig;
use crate::error::WebBootstrapError;

/// Bootstraps all infrastructure components and returns the ready `AppState` plus a
/// scheduler `JoinHandle` for graceful shutdown.
pub async fn bootstrap(
    database_url: &str,
    minio_config: MinioRuntimeConfig,
    cancel: CancellationToken,
) -> Result<(AppState, JoinHandle<()>), WebBootstrapError> {
    let db = bootstrap_database(database_url).await?;
    let pool = db.into_pool();

    let media_repository = Arc::new(PostgresMediaRepository::new(pool));
    let object_store = Arc::new(MinioObjectStore::new(minio_config.into_infra_config())?);

    // Run re-presign immediately on startup so the server begins in a consistent state.
    let startup_job =
        RePresignExpiredMediaJob::new(Arc::clone(&object_store), Arc::clone(&media_repository));
    only_info!("running startup re-presign pass");
    startup_job.run().await;

    // Register the same job for recurring daily execution.
    let recurring_job =
        RePresignExpiredMediaJob::new(Arc::clone(&object_store), Arc::clone(&media_repository));
    let mut scheduler = Scheduler::new();
    scheduler.register(recurring_job);
    let scheduler_handle = scheduler.start(cancel)?;

    let state = AppState::new(object_store, media_repository);

    Ok((state, scheduler_handle))
}

async fn bootstrap_database(database_url: &str) -> Result<Database, WebBootstrapError> {
    let catalog = default_migration_catalog()?;
    let location = DatabaseLocation::new(database_url.to_string());

    DatabaseBootstrapper::<SystemTimestampSource>::system()
        .bootstrap(&location, &catalog)
        .await
        .map_err(WebBootstrapError::Database)
}
