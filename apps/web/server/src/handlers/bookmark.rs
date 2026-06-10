use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::BookmarkError;
use only_contracts::{BookmarkPath, CreateBookmarkRequest, UpdateBookmarkRequest};

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Maps a [`BookmarkError`] to an HTTP response with an appropriate status code.
fn bookmark_error_response(error: BookmarkError) -> Response {
    match error {
        BookmarkError::NotFound { id } => {
            (StatusCode::NOT_FOUND, format!("bookmark not found: {id}")).into_response()
        }
        BookmarkError::BookmarkRepository { message } => {
            (StatusCode::INTERNAL_SERVER_ERROR, message).into_response()
        }
    }
}

/// `GET /api/bookmarks` — lists all bookmarks for the authenticated user.
pub async fn list_bookmarks(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.bookmark_api.list(user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}

/// `POST /api/bookmarks` — creates a new bookmark.
pub async fn create_bookmark(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateBookmarkRequest>,
) -> Response {
    match state.bookmark_api.create(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}

/// `GET /api/bookmarks/:id` — fetches a single bookmark.
pub async fn get_bookmark(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<BookmarkPath>,
) -> Response {
    match state.bookmark_api.get(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}

/// `PUT /api/bookmarks/:id` — replaces the mutable fields of a bookmark.
pub async fn update_bookmark(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<BookmarkPath>,
    Json(body): Json<UpdateBookmarkRequest>,
) -> Response {
    match state
        .bookmark_api
        .update(&path.id, body, user.user_id)
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}

/// `DELETE /api/bookmarks/:id` — soft-deletes the bookmark.
pub async fn delete_bookmark(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<BookmarkPath>,
) -> Response {
    match state.bookmark_api.delete(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}

/// `POST /api/bookmarks/:id/click` — increments the click counter on a bookmark.
pub async fn click_bookmark(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<BookmarkPath>,
) -> Response {
    match state.bookmark_api.click(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => bookmark_error_response(e),
    }
}
