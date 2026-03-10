use rusqlite::{params, Connection, Result as SqliteResult};
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

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
    conn: Mutex<Connection>,
}

impl MediaCacheDb {
    pub fn new(path: &str) -> SqliteResult<Self> {
        let conn = Connection::open(path)?;
        let db = MediaCacheDb {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn new_in_memory() -> SqliteResult<Self> {
        let conn = Connection::open_in_memory()?;
        let db = MediaCacheDb {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS media_cache (
                uuid TEXT PRIMARY KEY,
                content_type TEXT NOT NULL
            );",
        )?;
        Ok(())
    }

    pub fn get_content_type(&self, uuid: &str) -> SqliteResult<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT content_type FROM media_cache WHERE uuid = ?1")?;
        let mut rows = stmt.query_map(params![uuid], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(ct) => Ok(Some(ct?)),
            None => Ok(None),
        }
    }

    pub fn set_content_type(&self, uuid: &str, content_type: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO media_cache (uuid, content_type) VALUES (?1, ?2)",
            params![uuid, content_type],
        )?;
        Ok(())
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

    /// Check if a uuid is currently being downloaded.
    pub fn contains(&self, uuid: &str) -> bool {
        let set = self.inner.lock().unwrap();
        set.contains(uuid)
    }

    /// Remove a uuid from the downloading set.
    pub fn remove(&self, uuid: &str) {
        let mut set = self.inner.lock().unwrap();
        set.remove(uuid);
    }
}

// --- Protocol handler ---

/// Build an HTTP response with CORS headers
fn build_cors_response(
    status: tauri::http::StatusCode,
    content_type: &str,
    body: Vec<u8>,
) -> tauri::http::Response<Vec<u8>> {
    tauri::http::Response::builder()
        .status(status)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, OPTIONS")
        .header("Access-Control-Allow-Headers", "*")
        .header("Content-Type", content_type)
        .body(body)
        .unwrap()
}

fn build_error_response(status: u16, msg: &str) -> tauri::http::Response<Vec<u8>> {
    build_cors_response(
        tauri::http::StatusCode::from_u16(status).unwrap_or(tauri::http::StatusCode::INTERNAL_SERVER_ERROR),
        "text/plain",
        msg.as_bytes().to_vec(),
    )
}

/// Handle a request for `onlyquant://localhost/api/m/{uuid}`
/// This uses the synchronous `register_uri_scheme_protocol` approach.
pub fn handle_media_request(
    objects_dir: &PathBuf,
    db: &MediaCacheDb,
    tasks: &DownloadingTasks,
    request: &tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Vec<u8>> {
    let uri = request.uri();
    let path = uri.path();

    // Extract uuid from /api/m/{uuid}
    let uuid = match path.strip_prefix("/api/m/") {
        Some(u) if u.len() >= 4 => u.to_string(),
        _ => {
            return build_error_response(400, "Invalid path, expected /api/m/{uuid}");
        }
    };

    // Validate uuid contains only safe characters (alphanumeric and hyphens)
    if !uuid.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return build_error_response(400, "Invalid uuid format");
    }

    let file_path = cache_file_path(objects_dir, &uuid);

    // --- First check: lockless disk read ---
    if file_path.exists() {
        return return_cached_file(&file_path, &uuid, db);
    }

    // --- Enter lock zone ---
    {
        // Second check under conceptual lock (DownloadingTasks uses internal Mutex)
        // Re-check disk (another thread may have just finished writing)
        if file_path.exists() {
            return return_cached_file(&file_path, &uuid, db);
        }

        // Check if someone else is downloading this uuid
        if tasks.contains(&uuid) {
            // Spin wait: 200ms intervals, max 10 times
            for _ in 0..10 {
                std::thread::sleep(std::time::Duration::from_millis(200));
                if file_path.exists() {
                    return return_cached_file(&file_path, &uuid, db);
                }
                if !tasks.contains(&uuid) {
                    // Download finished but file doesn't exist - re-check
                    if file_path.exists() {
                        return return_cached_file(&file_path, &uuid, db);
                    }
                    break;
                }
            }
            // After spin wait, if file still doesn't exist, fall through to download
            if file_path.exists() {
                return return_cached_file(&file_path, &uuid, db);
            }
        }

        // Claim the download slot - if another thread claimed it between our check
        // and now, spin wait instead
        if !tasks.try_insert(&uuid) {
            for _ in 0..10 {
                std::thread::sleep(std::time::Duration::from_millis(200));
                if file_path.exists() {
                    return return_cached_file(&file_path, &uuid, db);
                }
                if !tasks.contains(&uuid) {
                    if file_path.exists() {
                        return return_cached_file(&file_path, &uuid, db);
                    }
                    break;
                }
            }
            if file_path.exists() {
                return return_cached_file(&file_path, &uuid, db);
            }
            // Still not available, proceed to download ourselves
            tasks.try_insert(&uuid);
        }
    }

    // --- Execute synchronous download (outside lock) ---
    let download_url = format!("{}/api/m/{}", backend_url(), uuid);
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => {
            tasks.remove(&uuid);
            return build_error_response(502, &format!("Failed to create HTTP client: {}", e));
        }
    };

    let response = client.get(&download_url).send();

    let response = match response {
        Ok(r) => r,
        Err(e) => {
            tasks.remove(&uuid);
            return build_error_response(502, &format!("Failed to download: {}", e));
        }
    };

    if !response.status().is_success() {
        tasks.remove(&uuid);
        return build_error_response(
            response.status().as_u16(),
            &format!("Remote server returned {}", response.status()),
        );
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = match response.bytes() {
        Ok(b) => b.to_vec(),
        Err(e) => {
            tasks.remove(&uuid);
            return build_error_response(502, &format!("Failed to read response body: {}", e));
        }
    };

    // Build the response to return immediately to the frontend
    let resp = build_cors_response(
        tauri::http::StatusCode::OK,
        &content_type,
        bytes.clone(),
    );

    // --- Async task: save to disk and DB, then remove from tasks ---
    let objects_dir_clone = objects_dir.clone();
    let uuid_clone = uuid.clone();
    let content_type_clone = content_type.clone();
    // We need a reference to the db and tasks that's 'static.
    // Since db and tasks are managed via OnceLock<>, we can access them statically.
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build();
        if let Ok(rt) = rt {
            rt.block_on(async {
                save_to_disk_atomic(&objects_dir_clone, &uuid_clone, &bytes).await;
            });
        }
        // Write content_type to DB
        if let Some(db) = get_cache_db() {
            let _ = db.set_content_type(&uuid_clone, &content_type_clone);
        }
        // Remove from downloading tasks
        if let Some(tasks) = get_downloading_tasks() {
            tasks.remove(&uuid_clone);
        }
    });

    resp
}

fn return_cached_file(
    file_path: &PathBuf,
    uuid: &str,
    db: &MediaCacheDb,
) -> tauri::http::Response<Vec<u8>> {
    match std::fs::read(file_path) {
        Ok(data) => {
            let content_type = db
                .get_content_type(uuid)
                .ok()
                .flatten()
                .unwrap_or_else(|| "application/octet-stream".to_string());
            build_cors_response(tauri::http::StatusCode::OK, &content_type, data)
        }
        Err(e) => build_error_response(500, &format!("Failed to read cached file: {}", e)),
    }
}

async fn save_to_disk_atomic(objects_dir: &PathBuf, uuid: &str, data: &[u8]) {
    let final_path = cache_file_path(objects_dir, uuid);

    // Ensure parent directories exist
    if let Some(parent) = final_path.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }

    // Append .tmp suffix (not replacing extension) to create temp path
    let mut tmp_name = final_path.file_name().unwrap().to_os_string();
    tmp_name.push(".tmp");
    let tmp_path = final_path.with_file_name(tmp_name);
    if tokio::fs::write(&tmp_path, data).await.is_ok() {
        // rename is atomic, guaranteeing file is either absent or complete
        let _ = tokio::fs::rename(&tmp_path, &final_path).await;
    }
}

// --- Global state accessors (used by async thread) ---

use std::sync::OnceLock;

static CACHE_DB: OnceLock<MediaCacheDb> = OnceLock::new();
static DOWNLOADING_TASKS: OnceLock<DownloadingTasks> = OnceLock::new();
static OBJECTS_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn init_media_cache(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let objects_dir = app_data_dir.join("objects");
    std::fs::create_dir_all(&objects_dir).map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("media_cache.db");
    let db =
        MediaCacheDb::new(db_path.to_str().unwrap()).map_err(|e| e.to_string())?;

    CACHE_DB
        .set(db)
        .map_err(|_| "MediaCacheDb already initialized".to_string())?;
    DOWNLOADING_TASKS
        .set(DownloadingTasks::new())
        .map_err(|_| "DownloadingTasks already initialized".to_string())?;
    OBJECTS_DIR
        .set(objects_dir)
        .map_err(|_| "ObjectsDir already initialized".to_string())?;

    Ok(())
}

pub fn get_cache_db() -> Option<&'static MediaCacheDb> {
    CACHE_DB.get()
}

pub fn get_downloading_tasks() -> Option<&'static DownloadingTasks> {
    DOWNLOADING_TASKS.get()
}

pub fn get_objects_dir() -> Option<&'static PathBuf> {
    OBJECTS_DIR.get()
}

use tauri::Manager;

/// Register the `onlyquant` URI scheme protocol on the Tauri builder.
pub fn register_protocol<R: tauri::Runtime>(
    builder: tauri::Builder<R>,
) -> tauri::Builder<R> {
    builder.register_uri_scheme_protocol("onlyquant", |_ctx, request| {
        let objects_dir = match get_objects_dir() {
            Some(d) => d,
            None => {
                return build_error_response(500, "Media cache not initialized");
            }
        };
        let db = match get_cache_db() {
            Some(d) => d,
            None => {
                return build_error_response(500, "Media cache DB not initialized");
            }
        };
        let tasks = match get_downloading_tasks() {
            Some(t) => t,
            None => {
                return build_error_response(500, "Downloading tasks not initialized");
            }
        };

        handle_media_request(objects_dir, db, tasks, &request)
    })
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
    }

    #[test]
    fn test_downloading_tasks() {
        let tasks = DownloadingTasks::new();

        assert!(!tasks.contains("uuid1"));
        assert!(tasks.try_insert("uuid1"));
        assert!(tasks.contains("uuid1"));
        // Second insert returns false (already present)
        assert!(!tasks.try_insert("uuid1"));
        tasks.remove("uuid1");
        assert!(!tasks.contains("uuid1"));
    }

    #[test]
    fn test_backend_url() {
        let url = backend_url();
        // In test context with default feature, should contain onlyquant.top
        assert!(url.contains("onlyquant.top"));
    }

    #[test]
    fn test_build_cors_response() {
        let resp = build_cors_response(
            tauri::http::StatusCode::OK,
            "image/png",
            vec![1, 2, 3],
        );
        assert_eq!(resp.status(), 200);
        assert_eq!(
            resp.headers().get("Access-Control-Allow-Origin").unwrap(),
            "*"
        );
        assert_eq!(
            resp.headers().get("Content-Type").unwrap(),
            "image/png"
        );
        assert_eq!(resp.body(), &vec![1, 2, 3]);
    }
}
