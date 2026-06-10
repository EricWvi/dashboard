use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::EntryError;
use only_contracts::{
    CreateEntryRequest, DeleteEntryRequest, EntryPath, GetEntryRequest, ListEntriesRequest,
    UpdateEntryRequest,
};

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Maps an [`EntryError`] to an HTTP response with an appropriate status code.
fn entry_error_response(error: EntryError) -> Response {
    match error {
        EntryError::NotFound { id } => {
            (StatusCode::NOT_FOUND, format!("entry not found: {id}")).into_response()
        }
        EntryError::EntryRepository { message } => {
            (StatusCode::INTERNAL_SERVER_ERROR, message).into_response()
        }
    }
}

/// `GET /api/entries` — lists entries with optional filters.
pub async fn list_entries(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Query(req): Query<ListEntriesRequest>,
) -> Response {
    match state.entry_api.list(req, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `POST /api/entries` — creates a new entry.
pub async fn create_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateEntryRequest>,
) -> Response {
    match state.entry_api.create(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `GET /api/entries/:id` — fetches a single entry by id.
pub async fn get_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(req): Path<GetEntryRequest>,
) -> Response {
    match state.entry_api.get(&req.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `PUT /api/entries/:id` — replaces the mutable fields of an entry.
pub async fn update_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<EntryPath>,
    Json(body): Json<UpdateEntryRequest>,
) -> Response {
    match state.entry_api.update(&path.id, body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `DELETE /api/entries/:id` — soft-deletes the entry.
pub async fn delete_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(req): Path<DeleteEntryRequest>,
) -> Response {
    match state.entry_api.delete(&req.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `POST /api/entries/:id/bookmark` — sets bookmark = true.
pub async fn bookmark_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<EntryPath>,
) -> Response {
    match state.entry_api.bookmark(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `POST /api/entries/:id/unbookmark` — sets bookmark = false.
pub async fn unbookmark_entry(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<EntryPath>,
) -> Response {
    match state.entry_api.unbookmark(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => entry_error_response(e),
    }
}

/// `GET /api/tags` — lists tags by group.
pub async fn list_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Query(req): Query<only_contracts::ListTagsRequest>,
) -> Response {
    match state.entry_api.list_tags(req, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `POST /api/tags` — creates a batch of tags.
pub async fn create_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<only_contracts::CreateTagsRequest>,
) -> Response {
    match state.entry_api.create_tags(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `DELETE /api/tags` — soft-deletes a tag by name and group.
pub async fn delete_tag(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<only_contracts::DeleteTagRequest>,
) -> Response {
    match state.entry_api.delete_tag(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
