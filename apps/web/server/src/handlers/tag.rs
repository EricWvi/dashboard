use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_contracts::{CreateTagsRequest, DeleteTagRequest, ListTagsRequest};

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// `GET /api/tags` — lists tags by group.
pub async fn list_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Query(req): Query<ListTagsRequest>,
) -> Response {
    match state.tag_api.list_tags(req, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `POST /api/tags` — creates a batch of tags.
pub async fn create_tags(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<CreateTagsRequest>,
) -> Response {
    match state.tag_api.create_tags(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// `DELETE /api/tags` — soft-deletes a tag by name and group.
pub async fn delete_tag(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<DeleteTagRequest>,
) -> Response {
    match state.tag_api.delete_tag(body, user.user_id).await {
        Ok(resp) => (StatusCode::OK, Json(resp)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
