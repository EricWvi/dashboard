use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use axum::extract::{Multipart, Path as AxumPath, Request, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use tower::ServiceExt;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeFile;

use only_logging::only_error;

use crate::auth::apply_auth_header;
use crate::db::MediaCacheDb;
use crate::fs::{cache_file_path, write_bytes_atomically};
use crate::tasks::DownloadingTasks;
use crate::upload::{UploadRetry, spawn_upload_media_job};

#[derive(Clone)]
pub(crate) struct MediaServerState {
    pub(crate) objects_dir: PathBuf,
    pub(crate) db: Arc<MediaCacheDb>,
    pub(crate) tasks: Arc<DownloadingTasks>,
    pub(crate) backend_url: String,
}

/// Rejects content-type strings that would be invalid as HTTP header values,
/// falling back to a safe default to prevent header injection.
pub(crate) fn sanitize_content_type(content_type: &str) -> String {
    if !content_type.is_empty() && HeaderValue::from_str(content_type).is_ok() {
        content_type.to_string()
    } else {
        "application/octet-stream".to_string()
    }
}

/// Downloads the file from the backend, writes it to disk atomically, and
/// records its content type in the database.
pub(crate) async fn async_download_and_save(
    uuid: &str,
    file_path: &Path,
    db: Arc<MediaCacheDb>,
    backend_url: &str,
) -> Result<(), String> {
    let download_url = format!("{backend_url}/api/m/{uuid}");
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = apply_auth_header(client.get(&download_url))
        .send()
        .await
        .map_err(|e| format!("Failed to download: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Remote server returned {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(sanitize_content_type)
        .unwrap_or_else(|| "application/octet-stream".to_string());

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let path_buf = file_path.to_path_buf();
    tokio::task::spawn_blocking(move || write_bytes_atomically(&path_buf, &bytes))
        .await
        .map_err(|e| format!("Failed to join write task: {e}"))??;

    let db_clone = db.clone();
    let uuid = uuid.to_string();
    let ct_clone = content_type.clone();
    tokio::task::spawn_blocking(move || db_clone.set_content_type(&uuid, &ct_clone))
        .await
        .map_err(|e| format!("Failed to join db task: {e}"))?
        .map_err(|e| format!("Failed to write content type: {e}"))?;

    Ok(())
}

/// Polls for the file to appear on disk (for when another task owns the download).
async fn wait_for_file_on_disk(file_path: &Path) {
    for _ in 0..10 {
        if file_path.exists() {
            return;
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
}

pub(crate) async fn handle_media_request(
    AxumPath(uuid): AxumPath<String>,
    State(state): State<MediaServerState>,
    request: Request,
) -> Response {
    if uuid.len() < 4 {
        return (
            StatusCode::BAD_REQUEST,
            "Invalid path, expected /api/m/{uuid}",
        )
            .into_response();
    }
    if !uuid.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return (StatusCode::BAD_REQUEST, "Invalid uuid format").into_response();
    }

    let file_path = cache_file_path(&state.objects_dir, &uuid);

    if !file_path.exists() {
        if state.tasks.try_insert(&uuid) {
            if let Err(e) =
                async_download_and_save(&uuid, &file_path, state.db.clone(), &state.backend_url)
                    .await
            {
                state.tasks.remove(&uuid);
                return (StatusCode::BAD_GATEWAY, e).into_response();
            }
            state.tasks.remove(&uuid);
        } else {
            wait_for_file_on_disk(&file_path).await;
        }
    }

    if !file_path.exists() {
        return (StatusCode::NOT_FOUND, "Media not found").into_response();
    }

    let content_type = state
        .db
        .get_content_type(&uuid)
        .ok()
        .flatten()
        .map(|ct| sanitize_content_type(&ct))
        .unwrap_or_else(|| "application/octet-stream".to_string());

    match ServeFile::new(&file_path).oneshot(request).await {
        Ok(response) => {
            let (mut parts, body) = response.into_parts();
            if let Ok(value) = HeaderValue::from_str(&content_type) {
                parts.headers.insert(header::CONTENT_TYPE, value);
            }
            axum::response::Response::from_parts(parts, axum::body::Body::new(body)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("ServeFile failed: {e}"),
        )
            .into_response(),
    }
}

pub(crate) async fn handle_upload_request(
    State(state): State<MediaServerState>,
    mut multipart: Multipart,
) -> Response {
    let mut uploaded_ids = Vec::new();

    loop {
        let next_field = match multipart.next_field().await {
            Ok(field) => field,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    format!("Invalid multipart form: {e}"),
                )
                    .into_response();
            }
        };
        let Some(field) = next_field else {
            break;
        };
        if field.name() != Some("photos") {
            continue;
        }

        let content_type = field
            .content_type()
            .map(sanitize_content_type)
            .unwrap_or_else(|| "application/octet-stream".to_string());
        let file_name = field
            .file_name()
            .map(str::to_string)
            .unwrap_or_else(|| "upload.bin".to_string());

        let bytes = match field.bytes().await {
            Ok(b) => b,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    format!("Failed to read upload bytes: {e}"),
                )
                    .into_response();
            }
        };

        let uuid = uuid::Uuid::new_v4().to_string();
        let file_path = cache_file_path(&state.objects_dir, &uuid);

        if let Err(e) = write_bytes_atomically(&file_path, &bytes) {
            return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
        }
        if let Err(e) = state.db.set_content_type(&uuid, &content_type) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to write media_cache entry: {e}"),
            )
                .into_response();
        }
        if let Err(e) = state.db.upsert_media_job(&uuid, &content_type, &file_name) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to write media_job entry: {e}"),
            )
                .into_response();
        }

        spawn_upload_media_job(
            uuid.clone(),
            file_path,
            content_type,
            file_name,
            state.db.clone(),
            state.backend_url.clone(),
            UploadRetry {
                max_attempts: 3,
                sleep_between_attempts: Duration::from_secs(5),
            },
        );

        uploaded_ids.push(uuid);
    }

    if uploaded_ids.is_empty() {
        return (StatusCode::BAD_REQUEST, "No files found in form data").into_response();
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({ "photos": uploaded_ids })),
    )
        .into_response()
}

/// Binds an ephemeral port, starts the axum server in a background task, and
/// returns the bound port number.
pub(crate) fn start_local_media_server(
    objects_dir: PathBuf,
    db: Arc<MediaCacheDb>,
    tasks: Arc<DownloadingTasks>,
    backend_url: String,
) -> Result<u16, String> {
    let state = MediaServerState {
        objects_dir,
        db,
        tasks,
        backend_url,
    };
    let app = Router::new()
        .route("/api/m/{uuid}", get(handle_media_request))
        .route("/api/upload", post(handle_upload_request))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind media server: {e}"))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set listener nonblocking: {e}"))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to read local addr: {e}"))?
        .port();

    tokio::spawn(async move {
        let listener = match tokio::net::TcpListener::from_std(listener) {
            Ok(l) => l,
            Err(e) => {
                only_error!("media_cache: failed to create async listener: {e}");
                return;
            }
        };
        if let Err(e) = axum::serve(listener, app).await {
            only_error!("media_cache: local media server exited with error: {e}");
        }
    });

    Ok(port)
}

#[cfg(test)]
mod tests {
    use super::sanitize_content_type;

    #[test]
    fn valid_content_type_passes_through() {
        assert_eq!(sanitize_content_type("image/jpeg"), "image/jpeg");
    }

    #[test]
    fn content_type_with_newline_is_rejected() {
        assert_eq!(
            sanitize_content_type("video/mp4\nX-Bad: injected"),
            "application/octet-stream"
        );
    }

    #[test]
    fn content_type_with_del_char_is_rejected() {
        // DEL (0x7F) is not a valid header value byte per RFC 7230.
        assert_eq!(
            sanitize_content_type("image/\x7F"),
            "application/octet-stream"
        );
    }
}
