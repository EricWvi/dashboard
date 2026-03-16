use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Result as SqliteResult};
use axum::{
    extract::{Multipart, Path, Request, State},
    http::{header, HeaderValue, StatusCode},
    Json,
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use tauri::Manager;
use tower::ServiceExt;
use tower_http::{cors::CorsLayer, services::ServeFile};

// --- Backend URL via conditional compilation ---

#[cfg(feature = "flomo")]
pub const SITE_NAME: &str = "flomo";

#[cfg(feature = "dashboard")]
pub const SITE_NAME: &str = "dashboard";

#[cfg(feature = "journal")]
pub const SITE_NAME: &str = "journal";

#[cfg(not(any(feature = "flomo", feature = "dashboard", feature = "journal")))]
pub const SITE_NAME: &str = "flomo";

pub fn backend_url() -> String {
    format!("https://{}.onlyquant.top", SITE_NAME)
}

// --- MediaCacheDb ---

pub struct MediaCacheDb {
    pool: Pool<SqliteConnectionManager>,
}

impl MediaCacheDb {
    pub fn new(path: &str) -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::file(path).with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "busy_timeout", "5000")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        let pool = Pool::builder()
            .max_size(8)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = MediaCacheDb { pool };
        db.run_migrations()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn new_in_memory() -> SqliteResult<Self> {
        let manager = SqliteConnectionManager::memory().with_init(|conn| {
            conn.pragma_update(None, "journal_mode", "WAL")?;
            conn.pragma_update(None, "synchronous", "NORMAL")?;
            Ok(())
        });
        // max_size=1: in-memory databases are per-connection; a single connection
        // ensures all operations share the same in-memory database.
        let pool = Pool::builder()
            .max_size(1)
            .build(manager)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let db = MediaCacheDb { pool };
        db.run_migrations()?;
        Ok(db)
    }

    fn conn(
        &self,
    ) -> SqliteResult<r2d2::PooledConnection<SqliteConnectionManager>> {
        self.pool
            .get()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS media_cache (
                uuid TEXT PRIMARY KEY,
                content_type TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS media_job (
                uuid TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                file_name TEXT NOT NULL
            );
            ",
        )?;
        let has_file_name: i64 = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('media_job') WHERE name = 'file_name'",
            [],
            |row| row.get(0),
        )?;
        if has_file_name == 0 {
            conn.execute(
                "ALTER TABLE media_job ADD COLUMN file_name TEXT NOT NULL DEFAULT 'upload.bin'",
                [],
            )?;
        }
        Ok(())
    }

    pub fn get_content_type(&self, uuid: &str) -> SqliteResult<Option<String>> {
        let conn = self.conn()?;
        let mut stmt =
            conn.prepare("SELECT content_type FROM media_cache WHERE uuid = ?1")?;
        let mut rows = stmt.query_map(params![uuid], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(ct) => Ok(Some(ct?)),
            None => Ok(None),
        }
    }

    pub fn set_content_type(&self, uuid: &str, content_type: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO media_cache (uuid, content_type) VALUES (?1, ?2)",
            params![uuid, content_type],
        )?;
        Ok(())
    }

    pub fn upsert_media_job(
        &self,
        uuid: &str,
        content_type: &str,
        file_name: &str,
    ) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO media_job (uuid, content_type, file_name) VALUES (?1, ?2, ?3)",
            params![uuid, content_type, file_name],
        )?;
        Ok(())
    }

    pub fn delete_media_job(&self, uuid: &str) -> SqliteResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM media_job WHERE uuid = ?1", params![uuid])?;
        Ok(())
    }

    pub fn list_media_jobs(&self) -> SqliteResult<Vec<(String, String, String)>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT uuid, content_type, file_name FROM media_job")?;
        let rows = stmt.query_map([], |row| {
            let uuid: String = row.get(0)?;
            let content_type: String = row.get(1)?;
            let file_name: String = row.get(2)?;
            Ok((uuid, content_type, file_name))
        })?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row?);
        }
        Ok(result)
    }
}

// --- File cache path helpers ---

/// Build the cache file path: `objects_dir/uuid[0..2]/uuid[2..4]/uuid`
pub fn cache_file_path(objects_dir: &PathBuf, uuid: &str) -> PathBuf {
    let prefix1 = &uuid[..2];
    let prefix2 = &uuid[2..4];
    objects_dir.join(prefix1).join(prefix2).join(uuid)
}

// --- Downloading tasks tracker ---

pub struct DownloadingTasks {
    inner: Mutex<HashSet<String>>,
}

impl DownloadingTasks {
    pub fn new() -> Self {
        DownloadingTasks {
            inner: Mutex::new(HashSet::new()),
        }
    }

    /// Try to acquire a download slot. Returns true if acquired (uuid was not in set).
    pub fn try_insert(&self, uuid: &str) -> bool {
        let mut set = self.inner.lock().unwrap();
        set.insert(uuid.to_string())
    }

    /// Remove a uuid from the downloading set.
    pub fn remove(&self, uuid: &str) {
        let mut set = self.inner.lock().unwrap();
        set.remove(uuid);
    }
}

// --- Protocol handler ---

#[derive(Clone)]
struct MediaServerState {
    objects_dir: PathBuf,
    db: Arc<MediaCacheDb>,
    tasks: Arc<DownloadingTasks>,
}

fn sanitize_content_type(content_type: &str) -> String {
    if tauri::http::header::HeaderValue::from_str(content_type).is_ok() {
        content_type.to_string()
    } else {
        "application/octet-stream".to_string()
    }
}

fn write_bytes_atomically(file_path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create cache dirs: {}", e))?;
    }
    let mut tmp_name = file_path
        .file_name()
        .ok_or_else(|| "Invalid file path".to_string())?
        .to_os_string();
    tmp_name.push(".tmp");
    let tmp_path = file_path.with_file_name(tmp_name);

    std::fs::write(&tmp_path, bytes)
        .map_err(|e| format!("Failed to write tmp file: {}", e))?;
    std::fs::rename(&tmp_path, file_path)
        .map_err(|e| format!("Failed to rename tmp file: {}", e))?;
    Ok(())
}

fn upload_file_to_backend(
    uuid: &str,
    file_path: &PathBuf,
    file_name: &str,
) -> Result<(), String> {
    let upload_url = format!("{}/api/upload", backend_url());
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let bytes = std::fs::read(file_path)
        .map_err(|e| format!("Failed to read cached file for upload: {}", e))?;

    let part =
        reqwest::blocking::multipart::Part::bytes(bytes).file_name(file_name.to_string());

    let form = reqwest::blocking::multipart::Form::new()
        .text("uuid", uuid.to_string())
        .part("photos", part);

    let response = client
        .post(&upload_url)
        .multipart(form)
        .send()
        .map_err(|e| format!("Failed to upload media: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Remote upload returned {}", response.status()));
    }

    Ok(())
}

fn spawn_upload_media_job(
    uuid: String,
    file_path: PathBuf,
    file_name: String,
    db: Arc<MediaCacheDb>,
    max_attempts: usize,
    sleep_between_attempts: Duration,
) {
    std::thread::spawn(move || {
        for attempt in 0..max_attempts {
            match upload_file_to_backend(&uuid, &file_path, &file_name) {
                Ok(_) => {
                    if let Err(e) = db.delete_media_job(&uuid) {
                        eprintln!(
                            "media_cache: uploaded {}, but failed to delete media_job: {}",
                            uuid, e
                        );
                    }
                    return;
                }
                Err(e) => {
                    eprintln!(
                        "media_cache: upload attempt {}/{} for {} failed: {}",
                        attempt + 1,
                        max_attempts,
                        uuid,
                        e
                    );
                    if attempt + 1 < max_attempts {
                        std::thread::sleep(sleep_between_attempts);
                    }
                }
            }
        }
    });
}

fn replay_media_jobs_once(objects_dir: &PathBuf, db: Arc<MediaCacheDb>) {
    let jobs = match db.list_media_jobs() {
        Ok(jobs) => jobs,
        Err(e) => {
            eprintln!("media_cache: failed to list media_job entries: {}", e);
            return;
        }
    };

    for (uuid, _, file_name) in jobs {
        let file_path = cache_file_path(objects_dir, &uuid);
        if !file_path.exists() {
            eprintln!(
                "media_cache: skip replay for {} because cached file is missing",
                uuid
            );
            continue;
        }

        spawn_upload_media_job(
            uuid,
            file_path,
            file_name,
            db.clone(),
            1,
            Duration::from_secs(0),
        );
    }
}

/// Synchronously download a file, save it to disk atomically, and write its
/// content type to the DB. Returns an error string on failure.
fn sync_download_and_save(
    uuid: &str,
    file_path: &PathBuf,
    db: &MediaCacheDb,
) -> Result<(), String> {
    let download_url = format!("{}/api/m/{}", backend_url(), uuid);
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&download_url)
        .send()
        .map_err(|e| format!("Failed to download: {}", e))?;

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
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    write_bytes_atomically(file_path, &bytes)?;

    // Persist content type
    db.set_content_type(uuid, &content_type)
        .map_err(|e| format!("Failed to write content type: {}", e))?;

    Ok(())
}

async fn handle_upload_request(
    State(state): State<MediaServerState>,
    mut multipart: Multipart,
) -> Response {
    let mut uploaded_ids = Vec::new();

    loop {
        let next_field = match multipart.next_field().await {
            Ok(field) => field,
            Err(e) => {
                return (StatusCode::BAD_REQUEST, format!("Invalid multipart form: {}", e))
                    .into_response()
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
            .map(|v| v.to_string())
            .unwrap_or_else(|| "upload.bin".to_string());

        let bytes = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                return (StatusCode::BAD_REQUEST, format!("Failed to read upload bytes: {}", e))
                    .into_response()
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
                format!("Failed to write media_cache entry: {}", e),
            )
                .into_response();
        }

        if let Err(e) = state.db.upsert_media_job(&uuid, &content_type, &file_name) {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to write media_job entry: {}", e),
            )
                .into_response();
        }

        spawn_upload_media_job(
            uuid.clone(),
            file_path,
            file_name,
            state.db.clone(),
            3,
            Duration::from_secs(5),
        );

        uploaded_ids.push(uuid);
    }

    if uploaded_ids.is_empty() {
        return (StatusCode::BAD_REQUEST, "No files found in form data").into_response();
    }

    (StatusCode::OK, Json(serde_json::json!({ "photos": uploaded_ids }))).into_response()
}

/// Spin-wait for a file to appear on disk (200ms × 10 = 2s max).
fn wait_for_file_on_disk(file_path: &PathBuf) {
    for _ in 0..10 {
        if file_path.exists() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
}

async fn handle_media_request(
    Path(uuid): Path<String>,
    State(state): State<MediaServerState>,
    request: Request,
) -> Response {
    if uuid.len() < 4 {
        return (StatusCode::BAD_REQUEST, "Invalid path, expected /api/m/{uuid}")
            .into_response();
    }

    // Validate uuid contains only safe characters (alphanumeric and hyphens)
    if !uuid.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return (StatusCode::BAD_REQUEST, "Invalid uuid format").into_response();
    }

    let file_path = cache_file_path(&state.objects_dir, &uuid);

    // 1. If not cached, download to disk first
    if !file_path.exists() {
        if state.tasks.try_insert(&uuid) {
            // We own the download slot — download, save, write DB synchronously
            if let Err(e) = sync_download_and_save(&uuid, &file_path, &state.db) {
                state.tasks.remove(&uuid);
                return (StatusCode::BAD_GATEWAY, e).into_response();
            }
            state.tasks.remove(&uuid);
        } else {
            // Another thread is downloading — wait for it to finish
            wait_for_file_on_disk(&file_path);
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

    match ServeFile::new(file_path).oneshot(request).await {
        Ok(mut response) => {
            if let Ok(header_value) = HeaderValue::from_str(&content_type) {
                response
                    .headers_mut()
                    .insert(header::CONTENT_TYPE, header_value);
            }
            response.into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("ServeFile failed: {}", e))
            .into_response(),
    }
}

fn start_local_media_server(
    objects_dir: PathBuf,
    db: Arc<MediaCacheDb>,
    tasks: Arc<DownloadingTasks>,
) -> Result<u16, String> {
    let state = MediaServerState {
        objects_dir,
        db,
        tasks,
    };

    let app = Router::new()
        .route("/api/m/:uuid", get(handle_media_request))
        .route("/api/upload", post(handle_upload_request))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind media server: {}", e))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set listener nonblocking: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to read local addr: {}", e))?
        .port();

    tauri::async_runtime::spawn(async move {
        let listener = match tokio::net::TcpListener::from_std(listener) {
            Ok(listener) => listener,
            Err(e) => {
                eprintln!("media_cache: failed to create async listener: {}", e);
                return;
            }
        };

        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("media_cache: local media server exited with error: {}", e);
        }
    });

    Ok(port)
}

// --- Global state accessors ---
static CACHE_DB: OnceLock<Arc<MediaCacheDb>> = OnceLock::new();
static DOWNLOADING_TASKS: OnceLock<Arc<DownloadingTasks>> = OnceLock::new();
static OBJECTS_DIR: OnceLock<PathBuf> = OnceLock::new();
static MEDIA_SERVER_PORT: OnceLock<u16> = OnceLock::new();

pub fn init_media_cache(app: &tauri::AppHandle) -> Result<(), String> {
    let external_dir = app
        .path()
        .document_dir()
        .map_err(|e| e.to_string())?;

    let objects_dir = external_dir.join("objects");
    std::fs::create_dir_all(&objects_dir).map_err(|e| e.to_string())?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("media_cache.db");
    let db = Arc::new(
        MediaCacheDb::new(db_path.to_str().unwrap()).map_err(|e| e.to_string())?,
    );
    let tasks = Arc::new(DownloadingTasks::new());

    replay_media_jobs_once(&objects_dir, db.clone());

    let port = start_local_media_server(objects_dir.clone(), db.clone(), tasks.clone())?;

    CACHE_DB
        .set(db)
        .map_err(|_| "MediaCacheDb already initialized".to_string())?;
    DOWNLOADING_TASKS
        .set(tasks)
        .map_err(|_| "DownloadingTasks already initialized".to_string())?;
    OBJECTS_DIR
        .set(objects_dir)
        .map_err(|_| "ObjectsDir already initialized".to_string())?;
    MEDIA_SERVER_PORT
        .set(port)
        .map_err(|_| "Media server port already initialized".to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_local_media_server_port() -> Result<u16, String> {
    MEDIA_SERVER_PORT
        .get()
        .copied()
        .ok_or_else(|| "Media server is not initialized".to_string())
}

// --- Tests ---

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_cache_file_path() {
        let objects_dir = PathBuf::from("/data/objects");
        let uuid = "abcdef1234567890";
        let path = cache_file_path(&objects_dir, uuid);
        assert_eq!(
            path,
            Path::new("/data/objects/ab/cd/abcdef1234567890")
        );
    }

    #[test]
    fn test_media_cache_db() {
        let db = MediaCacheDb::new_in_memory().unwrap();

        // Initially no entry
        assert_eq!(db.get_content_type("test-uuid").unwrap(), None);

        // Set and get
        db.set_content_type("test-uuid", "image/png").unwrap();
        assert_eq!(
            db.get_content_type("test-uuid").unwrap(),
            Some("image/png".to_string())
        );

        // Update
        db.set_content_type("test-uuid", "image/jpeg").unwrap();
        assert_eq!(
            db.get_content_type("test-uuid").unwrap(),
            Some("image/jpeg".to_string())
        );

        db.upsert_media_job("test-uuid", "image/jpeg", "photo.png")
            .unwrap();
        assert_eq!(
            db.list_media_jobs().unwrap(),
            vec![(
                "test-uuid".to_string(),
                "image/jpeg".to_string(),
                "photo.png".to_string(),
            )]
        );
    }

    #[test]
    fn test_downloading_tasks() {
        let tasks = DownloadingTasks::new();

        assert!(tasks.try_insert("uuid1"));
        // Second insert returns false (already present)
        assert!(!tasks.try_insert("uuid1"));
        tasks.remove("uuid1");
        // After removal, can insert again
        assert!(tasks.try_insert("uuid1"));
    }

    #[test]
    fn test_backend_url() {
        let url = backend_url();
        // In test context with default feature, should contain onlyquant.top
        assert!(url.contains("onlyquant.top"));
    }

    #[test]
    fn test_sanitize_content_type_invalid_value() {
        let invalid = "video/mp4\nX-Bad: yes";
        assert_eq!(sanitize_content_type(invalid), "application/octet-stream");
    }
}
