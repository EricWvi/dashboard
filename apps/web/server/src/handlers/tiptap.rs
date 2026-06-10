use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::TiptapError;
use only_contracts::{
    CreateQuickNoteRequest, CreateTiptapRequest, QuickNotePath, RestoreTiptapHistoryRequest,
    TiptapPath, UpdateQuickNoteRequest, UpdateTiptapRequest,
};

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Maps a [`TiptapError`] to an HTTP response with an appropriate status code.
fn tiptap_error_response(error: TiptapError) -> Response {
    match error {
        TiptapError::NotFound { id } => {
            (StatusCode::NOT_FOUND, format!("tiptap not found: {id}")).into_response()
        }
        TiptapError::QuickNoteNotFound { id } => {
            (StatusCode::NOT_FOUND, format!("quick note not found: {id}")).into_response()
        }
        TiptapError::HistoryNotFound { ts } => (
            StatusCode::NOT_FOUND,
            format!("history entry not found: {ts}"),
        )
            .into_response(),
        TiptapError::TiptapRepository { message }
        | TiptapError::QuickNoteRepository { message } => {
            (StatusCode::INTERNAL_SERVER_ERROR, message).into_response()
        }
    }
}

/// `POST /api/tiptaps` — creates a new Tiptap document.
pub async fn create_tiptap(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateTiptapRequest>,
) -> Response {
    match state.tiptap_api.create_tiptap(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `GET /api/tiptaps/:id` — fetches a single Tiptap document.
pub async fn get_tiptap(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<TiptapPath>,
) -> Response {
    match state.tiptap_api.get_tiptap(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `PUT /api/tiptaps/:id` — updates the content of a Tiptap document.
pub async fn update_tiptap(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<TiptapPath>,
    Json(body): Json<UpdateTiptapRequest>,
) -> Response {
    match state
        .tiptap_api
        .update_tiptap(&path.id, body, user.user_id)
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `GET /api/tiptaps/:id/history` — lists history timestamps for a document.
pub async fn list_tiptap_history(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<TiptapPath>,
) -> Response {
    match state.tiptap_api.list_history(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `POST /api/tiptaps/:id/history/restore` — restores a Tiptap document to a history snapshot.
pub async fn restore_tiptap_history(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<TiptapPath>,
    Json(body): Json<RestoreTiptapHistoryRequest>,
) -> Response {
    match state
        .tiptap_api
        .restore_history(&path.id, body, user.user_id)
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `GET /api/quicknotes` — lists all quick notes for the authenticated user.
pub async fn list_quick_notes(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.tiptap_api.list_notes(user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `POST /api/quicknotes` — creates a new quick note.
pub async fn create_quick_note(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateQuickNoteRequest>,
) -> Response {
    match state.tiptap_api.create_note(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `PUT /api/quicknotes/:id` — updates a quick note.
pub async fn update_quick_note(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<QuickNotePath>,
    Json(body): Json<UpdateQuickNoteRequest>,
) -> Response {
    match state
        .tiptap_api
        .update_note(&path.id, body, user.user_id)
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `DELETE /api/quicknotes/:id` — soft-deletes a quick note.
pub async fn delete_quick_note(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<QuickNotePath>,
) -> Response {
    match state.tiptap_api.delete_note(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}

/// `POST /api/quicknotes/:id/bottom` — moves a quick note to the bottom of the display order.
pub async fn bottom_quick_note(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Path(path): Path<QuickNotePath>,
) -> Response {
    match state.tiptap_api.bottom_note(&path.id, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => tiptap_error_response(e),
    }
}
