use axum::Router;
use axum::routing::{get, post};

use crate::app_state::AppState;
use crate::handlers::media::{delete_handler, serve_handler, upload_handler};

/// Builds the application router with all media routes registered.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/upload", post(upload_handler))
        .route("/api/m/{link}", get(serve_handler))
        .route("/api/media", post(delete_handler))
        .with_state(state)
}
