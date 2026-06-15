use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_contracts::{CreateTagsRequest, DeleteTagRequest};

use crate::app_state::AppState;
use crate::middleware::{AppContext, AuthenticatedUser};

/// `GET /api/tags` — lists tags for the app context resolved from the `Only-App` header.
pub async fn list_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    app: AppContext,
) -> Response {
    match state.tag_api.list_tags(user.user_id, app.group()).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `POST /api/tags` — creates a batch of tags under the app context.
pub async fn create_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    app: AppContext,
    Json(body): Json<CreateTagsRequest>,
) -> Response {
    match state
        .tag_api
        .create_tags(body, user.user_id, app.group())
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `DELETE /api/tags` — soft-deletes a tag by name within the app context.
pub async fn delete_tag(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    app: AppContext,
    Json(body): Json<DeleteTagRequest>,
) -> Response {
    match state
        .tag_api
        .delete_tag(body, user.user_id, app.group())
        .await
    {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
