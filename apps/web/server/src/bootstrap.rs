use std::sync::Arc;

use only_application::RePresignExpiredMediaJob;
use only_db_server::{
    Database, DatabaseBootstrapper, DatabaseLocation, PostgresMediaRepository,
    SystemTimestampSource, default_migration_catalog,
};
use only_infrastructure::HttpOidcClient;
use only_infrastructure::MinioObjectStore;
use only_logging::only_info;
use only_scheduler::Job;
use only_scheduler::Scheduler;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use crate::app_state::AppState;
use crate::config::{ENCRYPT_KEY_VAR, MinioRuntimeConfig, OidcConfig};
use crate::error::WebBootstrapError;
use crate::service::{CollectionApi, UserApi};

/// Bootstraps all infrastructure components and returns the ready `AppState` plus a
/// scheduler `JoinHandle` for graceful shutdown.
pub async fn bootstrap(
    database_url: &str,
    minio_config: MinioRuntimeConfig,
    cancel: CancellationToken,
) -> Result<(AppState, JoinHandle<()>), WebBootstrapError> {
    let encrypt_key = read_encrypt_key()?;
    let oidc_config = OidcConfig::from_env()?;
    let db = bootstrap_database(database_url).await?;
    let pool = db.into_pool();

    let media_repository = Arc::new(PostgresMediaRepository::new(pool.clone()));
    let object_store = Arc::new(MinioObjectStore::new(minio_config.into_infra_config())?);

    let startup_job =
        RePresignExpiredMediaJob::new(Arc::clone(&object_store), Arc::clone(&media_repository));
    only_info!("running startup re-presign pass");
    startup_job.run().await;

    let recurring_job =
        RePresignExpiredMediaJob::new(Arc::clone(&object_store), Arc::clone(&media_repository));
    let mut scheduler = Scheduler::new();
    scheduler.register(recurring_job);
    let scheduler_handle = scheduler.start(cancel)?;

    let collection_api = Arc::new(CollectionApi::new(pool.clone()));
    let user_api = Arc::new(UserApi::new(pool));
    let oidc_client = Arc::new(HttpOidcClient::new(oidc_config.into_infra_config()));

    let state = AppState::new(
        object_store,
        media_repository,
        collection_api,
        user_api,
        oidc_client,
        encrypt_key,
    );

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

/// Reads the AES-GCM encryption key from the process environment.
fn read_encrypt_key() -> Result<String, WebBootstrapError> {
    match std::env::var(ENCRYPT_KEY_VAR).ok() {
        Some(v) if !v.trim().is_empty() => Ok(v),
        _ => Err(WebBootstrapError::EncryptKeyEmpty),
    }
}
