use axum::Router;
use axum::routing::{get, post};

use crate::app_state::AppState;
use crate::handlers::collection::{
    create_collection, delete_collection, get_collection, list_all_todos, list_collections,
    list_today_todos, plan_today, update_collection,
};
use crate::handlers::media::{delete_handler, serve_handler, upload_handler};
use crate::middleware::auth_middleware;

/// Builds the application router with media and collection routes registered.
///
/// Collection and todo routes are protected by the JWT auth middleware.
pub fn build_router(state: AppState) -> Router {
    let media_routes = Router::new()
        .route("/api/upload", post(upload_handler))
        .route("/api/m/{link}", get(serve_handler))
        .route("/api/media", post(delete_handler));

    let protected_routes = Router::new()
        .route(
            "/api/collections",
            get(list_collections).post(create_collection),
        )
        .route(
            "/api/collections/{id}",
            get(get_collection)
                .put(update_collection)
                .delete(delete_collection),
        )
        .route("/api/todos/all", get(list_all_todos))
        .route("/api/todos/today", get(list_today_todos))
        .route("/api/todos/plan-today", post(plan_today))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    media_routes.merge(protected_routes).with_state(state)
}
