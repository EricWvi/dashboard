mod auth;
mod db;
mod fs;
mod server;
mod tasks;
mod upload;

#[cfg(test)]
mod tests;

pub use auth::{current_auth_token, set_auth_token};
pub use db::MediaCacheDb;
pub use fs::cache_file_path;
pub use tasks::DownloadingTasks;

use std::path::PathBuf;
use std::sync::{Arc, OnceLock};

static CACHE_DB: OnceLock<Arc<MediaCacheDb>> = OnceLock::new();
static OBJECTS_DIR: OnceLock<PathBuf> = OnceLock::new();
static MEDIA_SERVER_PORT: OnceLock<u16> = OnceLock::new();

/// Initialises the media cache subsystem and starts the local HTTP server.
///
/// `objects_dir` and `db_path` are resolved by the caller (e.g. from Tauri's
/// AppHandle). `backend_url` is the base URL of the remote API. `token` is the
/// initial auth token — pass an empty string if none is available yet.
///
/// Returns the ephemeral port the local server is listening on.
pub fn init_media_cache(
    objects_dir: PathBuf,
    db_path: PathBuf,
    backend_url: String,
    token: String,
) -> Result<u16, String> {
    std::fs::create_dir_all(&objects_dir).map_err(|e| e.to_string())?;

    let db_path_str = db_path
        .to_str()
        .ok_or_else(|| "DB path contains non-UTF-8 characters".to_string())?;
    let db = Arc::new(MediaCacheDb::new(db_path_str).map_err(|e| e.to_string())?);

    auth::init(token)?;

    upload::replay_media_jobs_once(&objects_dir, db.clone(), backend_url.clone());

    let tasks = Arc::new(DownloadingTasks::new());
    let port =
        server::start_local_media_server(objects_dir.clone(), db.clone(), tasks, backend_url)?;

    CACHE_DB
        .set(db)
        .map_err(|_| "MediaCacheDb already initialized".to_string())?;
    OBJECTS_DIR
        .set(objects_dir)
        .map_err(|_| "ObjectsDir already initialized".to_string())?;
    MEDIA_SERVER_PORT
        .set(port)
        .map_err(|_| "Media server port already initialized".to_string())?;

    Ok(port)
}

/// Returns the port the local media server is listening on.
/// Intended to be wrapped by a Tauri command in the host application.
pub fn get_local_media_server_port() -> Result<u16, String> {
    MEDIA_SERVER_PORT
        .get()
        .copied()
        .ok_or_else(|| "Media server is not initialized".to_string())
}
