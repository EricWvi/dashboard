mod app_state;
mod bootstrap;
mod config;
mod error;
mod handlers;
mod routes;

use config::MinioRuntimeConfig;
use only_logging::only_info;
use tokio_util::sync::CancellationToken;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL")?;
    let minio_config = MinioRuntimeConfig::from_env()?;
    let cancel = CancellationToken::new();

    let (state, _scheduler) =
        bootstrap::bootstrap(&database_url, minio_config, cancel.clone()).await?;

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
