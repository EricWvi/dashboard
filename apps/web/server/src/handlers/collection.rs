use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::CollectionError;
use only_contracts::{
    CollectionPath, CreateCollectionRequest, DeleteCollectionRequest, GetCollectionRequest,
    PlanTodayRequest, UpdateCollectionRequest,
};

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Maps a [`CollectionError`] to an HTTP response with an appropriate status code.
fn collection_error_response(error: CollectionError) -> Response {
    match error {
        CollectionError::NotFound { id } => {
            (StatusCode::NOT_FOUND, format!("collection not found: {id}")).into_response()
        }
        CollectionError::CollectionRepository { message }
        | CollectionError::TodoRepository { message } => {
            (StatusCode::INTERNAL_SERVER_ERROR, message).into_response()
        }
    }
}

/// `POST /api/collections` — creates a new collection for the authenticated user.
pub async fn create_collection(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateCollectionRequest>,
) -> Response {
    match state.collection_api.create(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `GET /api/collections/:id` — fetches a single collection by id.
pub async fn get_collection(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(req): Path<GetCollectionRequest>,
) -> Response {
    match state.collection_api.get(&req.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `GET /api/collections` — lists all collections for the authenticated user.
pub async fn list_collections(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.collection_api.list(user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `PUT /api/collections/:id` — replaces the mutable fields of a collection.
pub async fn update_collection(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<CollectionPath>,
    Json(body): Json<UpdateCollectionRequest>,
) -> Response {
    match state
        .collection_api
        .update(&path.id, body, user.user_id)
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `DELETE /api/collections/:id` — soft-deletes the collection and its todos.
pub async fn delete_collection(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(req): Path<DeleteCollectionRequest>,
) -> Response {
    match state.collection_api.delete(&req.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `GET /api/todos/all` — lists all non-inbox, incomplete todos with a schedule.
pub async fn list_all_todos(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.collection_api.list_all(user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `GET /api/todos/today` — lists todos scheduled for the current local day.
pub async fn list_today_todos(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.collection_api.list_today(user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}

/// `POST /api/todos/plan-today` — schedules the given incomplete todos to today.
pub async fn plan_today(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<PlanTodayRequest>,
) -> Response {
    match state.collection_api.plan_today(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => collection_error_response(e),
    }
}
