mod app_state;
mod bootstrap;
mod config;
mod error;
mod handlers;
mod middleware;
mod routes;
mod service;

#[cfg(test)]
mod tests;

use only_logging::{LogOutput, LoggingConfig, init_logging, only_info};
use tokio_util::sync::CancellationToken;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env before reading any environment variables; missing file is not an error.
    dotenvy::dotenv().ok();

    let log_level = config::read_log_level()?;
    let _logging_guard = init_logging(LoggingConfig::new(log_level, LogOutput::Stdout))?;

    let db_config = config::DatabaseRuntimeConfig::from_env()?;
    let minio_config = config::MinioRuntimeConfig::from_env()?;
    let cancel = CancellationToken::new();

    let (state, _scheduler) = bootstrap::bootstrap(
        &db_config.connection_string(),
        db_config.timezone(),
        minio_config,
        cancel.clone(),
    )
    .await?;

    let router = routes::build_router(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    only_info!(address = %addr, "server listening");

    axum::serve(listener, router)
        .with_graceful_shutdown(async move {
            // Ignore error: if the signal handler can't be installed, graceful shutdown
            // is unavailable but the server should still run.
            let _ = tokio::signal::ctrl_c().await;
            cancel.cancel();
        })
        .await?;

    Ok(())
}
