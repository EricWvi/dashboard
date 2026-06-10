use aes_gcm::aead::{Aead, AeadCore, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use base64::Engine as _;
use rand::rngs::OsRng;

use crate::app_state::AppState;

/// Carries the resolved user identity injected into request extensions by the auth middleware.
#[derive(Clone, Debug)]
pub struct AuthenticatedUser {
    pub user_id: i32,
}

/// Axum middleware that validates the `Onlyquant-Token` header and injects an `AuthenticatedUser`
/// extension for all downstream handlers.
///
/// Token format: base64(nonce || ciphertext) where the plaintext is the user's email address
/// and the cipher is AES-256-GCM keyed by `DASHBOARD_ENCRYPT_KEY`.
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    let token = request
        .headers()
        .get("Onlyquant-Token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    if token.is_empty() {
        return (StatusCode::BAD_REQUEST, "request is not authenticated").into_response();
    }

    let email = match decrypt_token(state.encrypt_key.as_bytes(), &token) {
        Ok(e) => e,
        Err(_) => return (StatusCode::BAD_REQUEST, "token is invalid").into_response(),
    };

    if email.is_empty() {
        return (StatusCode::BAD_REQUEST, "email is empty").into_response();
    }

    let user = match state.user_api.find_or_create(&email).await {
        Ok(u) => u,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("auth error: {e}"),
            )
                .into_response();
        }
    };

    request.extensions_mut().insert(AuthenticatedUser {
        user_id: user.id.value(),
    });

    next.run(request).await
}

/// Encrypts `plaintext` with AES-256-GCM and returns a base64-encoded `nonce || ciphertext`
/// blob compatible with the Go `service.Encrypt` format and readable by `decrypt_token`.
pub fn encrypt_token(key_bytes: &[u8], plaintext: &str) -> Result<String, EncryptError> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|_| EncryptError)?;
    let blob: Vec<u8> = nonce
        .as_slice()
        .iter()
        .chain(ciphertext.iter())
        .copied()
        .collect();
    Ok(base64::engine::general_purpose::STANDARD.encode(blob))
}

/// Decrypts an AES-256-GCM token produced by the Go `service.Encrypt` function.
///
/// The blob is standard-base64-encoded `nonce || ciphertext` where the nonce is 12 bytes.
fn decrypt_token(key_bytes: &[u8], blob: &str) -> Result<String, DecryptError> {
    let data = base64::engine::general_purpose::STANDARD
        .decode(blob)
        .map_err(|_| DecryptError)?;

    // AES-GCM nonce is always 12 bytes; the rest is ciphertext + tag.
    if data.len() < 12 {
        return Err(DecryptError);
    }
    let (nonce_bytes, ciphertext) = data.split_at(12);

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| DecryptError)?;

    String::from_utf8(plaintext).map_err(|_| DecryptError)
}

/// Opaque error for any decryption failure; details are intentionally not leaked to callers.
struct DecryptError;

/// Opaque error for any encryption failure.
#[derive(Debug)]
pub struct EncryptError;
