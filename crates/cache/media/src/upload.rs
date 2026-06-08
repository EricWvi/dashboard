use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use only_logging::{only_error, only_warn};

use crate::auth::apply_auth_header;
use crate::db::MediaCacheDb;
use crate::fs::cache_file_path;

/// Sends the cached file to the backend upload endpoint as a multipart request.
pub(crate) async fn upload_file_to_backend(
    uuid: &str,
    file_path: &Path,
    content_type: &str,
    file_name: &str,
    backend_url: &str,
) -> Result<(), String> {
    let upload_url = format!("{backend_url}/api/upload");
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let path = file_path.to_path_buf();
    let bytes = tokio::task::spawn_blocking(move || {
        std::fs::read(&path).map_err(|e| format!("Failed to read cached file for upload: {e}"))
    })
    .await
    .map_err(|e| format!("Failed to join read task: {e}"))??;

    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(file_name.to_string())
        .mime_str(content_type)
        .map_err(|e| format!("Invalid content type for upload part: {e}"))?;

    let form = reqwest::multipart::Form::new()
        .text("uuid", uuid.to_string())
        .part("photos", part);

    let response = apply_auth_header(client.post(&upload_url))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to upload media: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Remote upload returned {}", response.status()));
    }
    Ok(())
}

/// Retry configuration for upload jobs.
pub(crate) struct UploadRetry {
    pub max_attempts: usize,
    pub sleep_between_attempts: Duration,
}

/// Spawns a background task that retries the upload up to `retry.max_attempts` times,
/// removing the job from the database on success.
pub(crate) fn spawn_upload_media_job(
    uuid: String,
    file_path: PathBuf,
    content_type: String,
    file_name: String,
    db: Arc<MediaCacheDb>,
    backend_url: String,
    retry: UploadRetry,
) {
    let max_attempts = retry.max_attempts;
    let sleep_between_attempts = retry.sleep_between_attempts;
    tokio::spawn(async move {
        for attempt in 0..max_attempts {
            match upload_file_to_backend(&uuid, &file_path, &content_type, &file_name, &backend_url)
                .await
            {
                Ok(()) => {
                    let db_clone = db.clone();
                    let uuid_clone = uuid.clone();
                    if let Err(e) =
                        tokio::task::spawn_blocking(move || db_clone.delete_media_job(&uuid_clone))
                            .await
                            .map_err(|e| format!("Failed to join db task: {e}"))
                            .and_then(|r| r.map_err(|e| e.to_string()))
                    {
                        only_error!(
                            "media_cache: uploaded {uuid} but failed to delete media_job: {e}"
                        );
                    }
                    return;
                }
                Err(e) => {
                    only_error!(
                        "media_cache: upload attempt {}/{max_attempts} for {uuid} failed: {e}",
                        attempt + 1,
                    );
                    if attempt + 1 < max_attempts {
                        tokio::time::sleep(sleep_between_attempts).await;
                    }
                }
            }
        }
    });
}

/// At startup, re-queues any jobs left over from a previous run.
/// Skips jobs whose cached file is missing from disk.
pub(crate) fn replay_media_jobs_once(
    objects_dir: &Path,
    db: Arc<MediaCacheDb>,
    backend_url: String,
) {
    let jobs = match db.list_media_jobs() {
        Ok(jobs) => jobs,
        Err(e) => {
            only_error!("media_cache: failed to list media_job entries: {e}");
            return;
        }
    };

    for (uuid, content_type, file_name) in jobs {
        let file_path = cache_file_path(objects_dir, &uuid);
        if !file_path.exists() {
            only_warn!("media_cache: skip replay for {uuid} — cached file is missing");
            continue;
        }
        spawn_upload_media_job(
            uuid,
            file_path,
            content_type,
            file_name,
            db.clone(),
            backend_url.clone(),
            UploadRetry {
                max_attempts: 1,
                sleep_between_attempts: Duration::from_secs(0),
            },
        );
    }
}
