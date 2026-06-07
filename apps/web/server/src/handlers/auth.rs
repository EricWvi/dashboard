use axum::Json;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::OidcClient;
use only_contracts::{AuthQuery, AuthResponse};

use crate::app_state::AppState;
use crate::middleware::encrypt_token;

/// Handles the OIDC authorization code callback.
///
/// Exchanges the authorization code for an access token, fetches the user's email from the
/// userinfo endpoint, and returns an AES-256-GCM encrypted email token for use in subsequent
/// `Onlyquant-Token` headers.
pub async fn auth(State(state): State<AppState>, Query(params): Query<AuthQuery>) -> Response {
    let token_resp = match state
        .oidc_client
        .exchange_code(&params.code, &params.redirect_uri)
        .await
    {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("failed to exchange code for token: {e}"),
            )
                .into_response();
        }
    };

    let user_info = match state
        .oidc_client
        .get_user_info(&token_resp.access_token)
        .await
    {
        Ok(u) => u,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("failed to get user info: {e}"),
            )
                .into_response();
        }
    };

    if user_info.email.is_empty() {
        return (StatusCode::BAD_REQUEST, "userinfo response missing email").into_response();
    }

    let email = user_info.email;

    let token = match encrypt_token(state.encrypt_key.as_bytes(), &email) {
        Ok(t) => t,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "failed to encrypt token").into_response();
        }
    };

    (StatusCode::OK, Json(AuthResponse { token })).into_response()
}
