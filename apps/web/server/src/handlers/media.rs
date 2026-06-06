use axum::Json;
use axum::extract::{Multipart, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use only_application::{
    DeleteMediaCommand, DeleteMediaHandler, MediaError, ServeMediaCommand, ServeMediaHandler,
    UploadMediaCommand, UploadMediaHandler,
};
use only_infrastructure::media::content_type;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use only_logging::only_error;

use crate::app_state::AppState;
use crate::middleware::AuthenticatedUser;

/// Response body for the upload endpoint.
#[derive(Serialize)]
struct UploadResponse {
    photos: Vec<String>,
}

/// Request body for the delete endpoint.
#[derive(Deserialize)]
pub struct DeleteMediaRequest {
    ids: Vec<Uuid>,
}

/// Response body for the delete endpoint.
#[derive(Serialize)]
struct DeleteResponse {
    ids: Vec<Uuid>,
}

/// `POST /api/upload` — processes a multipart form with `photos[]` files and optional `uuid[]` links.
///
/// Content-type is resolved from the filename extension first, falling back to the
/// multipart part header value to match the Go handler behaviour.
pub async fn upload_handler(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    mut multipart: Multipart,
) -> Response {
    let handler = UploadMediaHandler::new(
        std::sync::Arc::clone(&state.object_store),
        std::sync::Arc::clone(&state.media_repository),
    );

    // Collect (file_data, filename, content_type_header, optional_uuid) tuples.
    // The multipart fields may arrive interleaved, so we gather all parts first.
    let mut files: Vec<(bytes::Bytes, String, String, Option<Uuid>)> = Vec::new();
    let mut uuid_queue: Vec<Option<Uuid>> = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "uuid[]" {
            let text = match field.text().await {
                Ok(t) => t,
                Err(_) => continue,
            };
            uuid_queue.push(text.parse::<Uuid>().ok());
        } else if field_name == "photos[]" {
            let filename = field.file_name().unwrap_or("upload").to_string();
            let content_type_header = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();

            let data = match field.bytes().await {
                Ok(b) => b,
                Err(e) => {
                    only_error!(error = %e, "failed to read multipart field");
                    return StatusCode::BAD_REQUEST.into_response();
                }
            };

            let ext = std::path::Path::new(&filename)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            let resolved_ct = if !ext.is_empty() {
                let from_ext = content_type::from_extension(&ext);
                if from_ext != "application/octet-stream" {
                    from_ext.to_string()
                } else {
                    content_type_header
                }
            } else {
                content_type_header
            };

            files.push((data, filename, resolved_ct, None));
        }
    }

    // Merge the uuid queue into the files list in order.
    for (i, file) in files.iter_mut().enumerate() {
        file.3 = uuid_queue.get(i).copied().flatten();
    }

    let creator_id = user.user_id;

    let mut links = Vec::with_capacity(files.len());
    for (data, filename, content_type_str, link) in files {
        let cmd = UploadMediaCommand {
            creator_id,
            filename,
            content_type: content_type_str,
            data,
            link,
        };
        match handler.handle(cmd).await {
            Ok(link) => links.push(link),
            Err(e) => {
                only_error!(error = %e, "upload failed");
                return StatusCode::INTERNAL_SERVER_ERROR.into_response();
            }
        }
    }

    (StatusCode::OK, Json(UploadResponse { photos: links })).into_response()
}

/// `GET /api/m/:link` — redirects to the presigned URL for the media identified by `link`.
pub async fn serve_handler(State(state): State<AppState>, Path(link): Path<String>) -> Response {
    let handler = ServeMediaHandler::new(std::sync::Arc::clone(&state.media_repository));
    let cmd = ServeMediaCommand { link };

    match handler.handle(cmd).await {
        Ok(url) => axum::response::Redirect::temporary(&url).into_response(),
        Err(MediaError::NotFound) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            only_error!(error = %e, "serve failed");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

/// `POST /api/media` — best-effort batch delete; returns the IDs that were successfully removed.
pub async fn delete_handler(
    State(state): State<AppState>,
    user: axum::Extension<AuthenticatedUser>,
    Json(body): Json<DeleteMediaRequest>,
) -> Response {
    let creator_id = user.user_id;

    let handler = DeleteMediaHandler::new(
        std::sync::Arc::clone(&state.object_store),
        std::sync::Arc::clone(&state.media_repository),
    );
    let cmd = DeleteMediaCommand {
        creator_id,
        ids: body.ids,
    };

    match handler.handle(cmd).await {
        Ok(result) => (
            StatusCode::OK,
            Json(DeleteResponse {
                ids: result.deleted,
            }),
        )
            .into_response(),
        Err(e) => {
            only_error!(error = %e, "delete handler failed");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
