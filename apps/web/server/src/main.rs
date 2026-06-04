mod app_state;
mod bootstrap;
mod config;
mod error;
mod handlers;
mod routes;

use config::MinioRuntimeConfig;
use tokio_util::sync::CancellationToken;
use only_logging::only_info;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let minio_config = MinioRuntimeConfig::from_env().expect("MinIO configuration is invalid");

    let cancel = CancellationToken::new();

    let (state, _scheduler) = bootstrap::bootstrap(&database_url, minio_config, cancel.clone())
        .await
        .expect("server bootstrap failed");

    let router = routes::build_router(state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind listener");

    only_info!(address = %addr, "server listening");

    axum::serve(listener, router)
        .with_graceful_shutdown(async move {
            tokio::signal::ctrl_c()
                .await
                .expect("failed to install CTRL+C handler");
            cancel.cancel();
        })
        .await
        .expect("server error");
}
