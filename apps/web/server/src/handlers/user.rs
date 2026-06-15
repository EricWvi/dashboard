use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_contracts::{GetUserResponse, UpdateUserRequest, UpdateUserResponse, UserView};
use only_domain::User;

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Maps a domain [`User`] to the public [`UserView`] projection.
fn to_view(user: User) -> UserView {
    UserView {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        language: user.language,
        updated_at: user.updated_at,
    }
}

/// Returns the authenticated user's profile.
pub async fn get_user(
    State(state): State<AppState>,
    axum::Extension(auth): axum::Extension<AuthenticatedUser>,
) -> Response {
    match state.user_api.find_by_id(auth.user_id).await {
        Ok(user) => (
            StatusCode::OK,
            Json(GetUserResponse {
                user: to_view(user),
            }),
        )
            .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

/// Updates the authenticated user's mutable profile fields and returns the updated record.
pub async fn update_user(
    State(state): State<AppState>,
    axum::Extension(auth): axum::Extension<AuthenticatedUser>,
    Json(body): Json<UpdateUserRequest>,
) -> Response {
    match state
        .user_api
        .update_profile(auth.user_id, &body.username, &body.avatar, &body.language)
        .await
    {
        Ok(user) => (
            StatusCode::OK,
            Json(UpdateUserResponse {
                user: to_view(user),
            }),
        )
            .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
