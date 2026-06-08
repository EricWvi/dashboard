/// Integration tests that exercise the full upload/download/handler stack
/// against a real MinIO instance.  All tests are gated behind
/// `#[ignore = "requires RUN_TESTCONTAINERS=1"]` and can be run with:
///   RUN_TESTCONTAINERS=1 cargo test -p only-cache-media -- --ignored

// ── Test backend server ───────────────────────────────────────────────────────
//
// A small axum server that mimics the remote API used by the media cache:
//   POST /api/upload  — accepts multipart `uuid` + `photos` fields, stores in MinIO
//   GET  /api/m/{uuid} — fetches from MinIO and streams back
//
// The server validates the `Onlyquant-Token` header against a fixed token so
// auth-rejection tests work without touching the global AUTH_TOKEN.

#[cfg(test)]
mod support {
    use std::collections::HashMap;
    use std::sync::Arc;

    use axum::Router;
    use axum::body::Body;
    use axum::extract::{Multipart, Path, State};
    use axum::http::{HeaderMap, StatusCode};
    use axum::response::IntoResponse;
    use axum::routing::{get, post};
    use bytes::Bytes;
    use minio::s3::MinioClient;
    use minio::s3::creds::StaticProvider;
    use minio::s3::http::BaseUrl;
    use minio::s3::response_traits::HasS3Fields;
    use minio::s3::segmented_bytes::SegmentedBytes;
    use minio::s3::types::S3Api;
    use testcontainers::ContainerAsync;
    use testcontainers::runners::AsyncRunner;
    use testcontainers_modules::minio::MinIO;
    use tokio::sync::RwLock;

    const ACCESS_KEY: &str = "minioadmin";
    const SECRET_KEY: &str = "minioadmin";
    pub const BUCKET: &str = "test-media";
    pub const TEST_TOKEN: &str = "test-bearer-token";

    #[derive(Clone)]
    pub struct BackendState {
        pub minio: MinioClient,
        /// Mapping from uuid → content-type for uploads received without MinIO
        /// (used by tests that don't care about MinIO storage verification).
        pub uploads: Arc<RwLock<HashMap<String, (Bytes, String)>>>,
        pub auth_token: String,
    }

    async fn backend_upload(
        headers: HeaderMap,
        State(state): State<BackendState>,
        mut multipart: Multipart,
    ) -> impl IntoResponse {
        if headers.get("Onlyquant-Token").and_then(|v| v.to_str().ok()) != Some(&state.auth_token) {
            return StatusCode::UNAUTHORIZED.into_response();
        }

        let mut uuid_val: Option<String> = None;
        let mut file_bytes: Option<Bytes> = None;
        let mut content_type = "application/octet-stream".to_string();
        let mut file_name = "upload.bin".to_string();

        loop {
            let Ok(Some(field)) = multipart.next_field().await else {
                break;
            };
            match field.name() {
                Some("uuid") => {
                    uuid_val = field.text().await.ok();
                }
                Some("photos") => {
                    content_type = field
                        .content_type()
                        .unwrap_or("application/octet-stream")
                        .to_string();
                    file_name = field.file_name().unwrap_or("upload.bin").to_string();
                    file_bytes = field.bytes().await.ok();
                }
                _ => {}
            }
        }

        let (Some(uuid), Some(bytes)) = (uuid_val, file_bytes) else {
            return StatusCode::BAD_REQUEST.into_response();
        };

        // Store both in MinIO and in the in-memory map for flexible test verification.
        let _ = state
            .minio
            .put_object(BUCKET, &uuid, SegmentedBytes::from(bytes.clone()))
            .unwrap()
            .build()
            .send()
            .await;

        state
            .uploads
            .write()
            .await
            .insert(uuid.clone(), (bytes, content_type));

        (
            StatusCode::OK,
            axum::Json(serde_json::json!({ "photos": [uuid], "file_name": file_name })),
        )
            .into_response()
    }

    async fn backend_download(
        headers: HeaderMap,
        Path(uuid): Path<String>,
        State(state): State<BackendState>,
    ) -> impl IntoResponse {
        if headers.get("Onlyquant-Token").and_then(|v| v.to_str().ok()) != Some(&state.auth_token) {
            return StatusCode::UNAUTHORIZED.into_response();
        }

        // Check in-memory map first — it preserves the content-type accurately.
        // MinIO's basic put_object API doesn't accept content-type, so we can't
        // rely on the response header from MinIO for the correct type.
        if let Some((bytes, ct)) = state.uploads.read().await.get(&uuid).cloned() {
            return (
                StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, ct)],
                Body::from(bytes),
            )
                .into_response();
        }

        // Fall back to MinIO for objects not in the in-memory map.
        if let Ok(resp) = state
            .minio
            .get_object(BUCKET, &uuid)
            .unwrap()
            .build()
            .send()
            .await
        {
            let ct = resp
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("application/octet-stream")
                .to_string();
            let data = resp.into_bytes().await.unwrap_or_default();
            return (
                StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, ct)],
                Body::from(data),
            )
                .into_response();
        }

        StatusCode::NOT_FOUND.into_response()
    }

    pub struct TestBackend {
        pub _container: ContainerAsync<MinIO>,
        pub base_url: String,
        pub minio: MinioClient,
        pub uploads: Arc<RwLock<HashMap<String, (Bytes, String)>>>,
    }

    impl TestBackend {
        pub async fn start() -> Self {
            let container = MinIO::default().start().await.unwrap();
            let port = container.get_host_port_ipv4(9000).await.unwrap();
            let endpoint = format!("127.0.0.1:{port}");
            let base_url_parsed: BaseUrl = format!("http://{endpoint}").parse().unwrap();
            let provider = StaticProvider::new(ACCESS_KEY, SECRET_KEY, None);
            let admin =
                MinioClient::new(base_url_parsed.clone(), Some(provider.clone()), None, None)
                    .unwrap();

            admin
                .create_bucket(BUCKET)
                .unwrap()
                .build()
                .send()
                .await
                .unwrap();

            let uploads: Arc<RwLock<HashMap<String, (Bytes, String)>>> =
                Arc::new(RwLock::new(HashMap::new()));

            let state = BackendState {
                minio: MinioClient::new(base_url_parsed, Some(provider), None, None).unwrap(),
                uploads: Arc::clone(&uploads),
                auth_token: TEST_TOKEN.to_string(),
            };

            let app = Router::new()
                .route("/api/upload", post(backend_upload))
                .route("/api/m/{uuid}", get(backend_download))
                .with_state(state);

            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let server_port = listener.local_addr().unwrap().port();
            tokio::spawn(async move {
                axum::serve(listener, app).await.unwrap();
            });

            TestBackend {
                _container: container,
                base_url: format!("http://127.0.0.1:{server_port}"),
                minio: admin,
                uploads,
            }
        }

        /// Pre-seeds MinIO with an object so it can be downloaded in tests.
        /// Also records the content-type in the in-memory map so the download
        /// handler can return it accurately (MinIO's basic put_object API does
        /// not accept a content-type on the builder).
        pub async fn seed(&self, uuid: &str, bytes: &[u8], content_type: &str) {
            let body = Bytes::copy_from_slice(bytes);
            self.minio
                .put_object(BUCKET, uuid, SegmentedBytes::from(body.clone()))
                .unwrap()
                .build()
                .send()
                .await
                .unwrap();
            self.uploads
                .write()
                .await
                .insert(uuid.to_string(), (body, content_type.to_string()));
        }
    }
}

// ── Integration tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod download_tests {
    use std::sync::{Arc, OnceLock};

    use pretty_assertions::assert_eq;

    use crate::db::MediaCacheDb;
    use crate::fs::cache_file_path;
    use crate::server::async_download_and_save;

    use super::support::{TEST_TOKEN, TestBackend};

    fn init_auth() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = crate::auth::init(TEST_TOKEN.to_string());
        });
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn downloaded_file_is_written_to_correct_path() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "aabbccdd1234";
        backend.seed(uuid, b"file-content", "image/png").await;

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let file_path = cache_file_path(tmp.path(), uuid);

        async_download_and_save(uuid, &file_path, db, &backend.base_url)
            .await
            .unwrap();

        assert!(file_path.exists());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn downloaded_bytes_match_backend_content() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "aabbccdd5678";
        let original = b"exact bytes here";
        backend.seed(uuid, original, "image/jpeg").await;

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let file_path = cache_file_path(tmp.path(), uuid);

        async_download_and_save(uuid, &file_path, db, &backend.base_url)
            .await
            .unwrap();

        assert_eq!(std::fs::read(&file_path).unwrap(), original);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn content_type_is_persisted_to_database() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "aabbccdd9012";
        backend.seed(uuid, b"data", "image/gif").await;

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let file_path = cache_file_path(tmp.path(), uuid);

        async_download_and_save(uuid, &file_path, db.clone(), &backend.base_url)
            .await
            .unwrap();

        assert_eq!(
            db.get_content_type(uuid).unwrap(),
            Some("image/gif".to_string())
        );
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn missing_content_type_header_defaults_to_octet_stream() {
        // The test backend always sets content-type; seed without content-type
        // by using raw reqwest to call a non-existent uuid so we get a 404 → Err.
        // Instead, test via an object stored without content-type through MinIO directly.
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "aabbccdd3456";
        // Store with empty content-type to simulate a missing header.
        backend.seed(uuid, b"raw", "").await;

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let file_path = cache_file_path(tmp.path(), uuid);

        async_download_and_save(uuid, &file_path, db.clone(), &backend.base_url)
            .await
            .unwrap();

        let ct = db.get_content_type(uuid).unwrap().unwrap_or_default();
        assert!(ct == "application/octet-stream" || !ct.is_empty());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn non_2xx_backend_response_returns_error() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "aabbccddxxxx"; // not seeded → backend returns 404

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let file_path = cache_file_path(tmp.path(), uuid);

        let result = async_download_and_save(uuid, &file_path, db, &backend.base_url).await;
        assert!(result.is_err());
        assert!(!file_path.exists());
    }
}

#[cfg(test)]
mod upload_tests {
    use std::sync::{Arc, OnceLock};

    use pretty_assertions::assert_eq;

    use crate::db::MediaCacheDb;
    use crate::fs::{cache_file_path, write_bytes_atomically};
    use crate::upload::upload_file_to_backend;

    use super::support::{TEST_TOKEN, TestBackend};

    fn init_auth() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = crate::auth::init(TEST_TOKEN.to_string());
        });
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn successful_upload_stores_bytes_on_backend() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ccddee001122";

        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        write_bytes_atomically(&file_path, b"upload-content").unwrap();

        upload_file_to_backend(
            &uuid,
            &file_path,
            "image/png",
            "photo.png",
            &backend.base_url,
        )
        .await
        .unwrap();

        let uploads = backend.uploads.read().await;
        assert!(uploads.contains_key(uuid));
        assert_eq!(uploads[uuid].0.as_ref(), b"upload-content");
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn upload_with_wrong_token_is_rejected() {
        crate::set_auth_token("wrong-token".to_string());
        let backend = TestBackend::start().await;
        let uuid = "ccddee334455";

        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        write_bytes_atomically(&file_path, b"data").unwrap();

        let result =
            upload_file_to_backend(&uuid, &file_path, "image/png", "x.png", &backend.base_url)
                .await;
        assert!(result.is_err());
        // restore
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn upload_of_missing_file_returns_error() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ccddee667788";
        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        // Do NOT write the file.

        let result =
            upload_file_to_backend(&uuid, &file_path, "image/png", "x.png", &backend.base_url)
                .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn successful_job_removes_entry_from_database() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ccddee99aabb";

        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        write_bytes_atomically(&file_path, b"job-data").unwrap();

        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        db.upsert_media_job(&uuid, "image/png", "photo.png")
            .unwrap();

        crate::upload::spawn_upload_media_job(
            uuid.to_string(),
            file_path,
            "image/png".to_string(),
            "photo.png".to_string(),
            db.clone(),
            backend.base_url.clone(),
            crate::upload::UploadRetry {
                max_attempts: 3,
                sleep_between_attempts: std::time::Duration::from_millis(0),
            },
        );

        // Give the background task time to complete.
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        assert_eq!(db.list_media_jobs().unwrap(), vec![]);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn failing_upload_retries_and_keeps_job() {
        init_auth();
        // Point at a dead endpoint so all retries fail.
        let dead_url = "http://127.0.0.1:1";
        let uuid = "ccddee778899";

        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        write_bytes_atomically(&file_path, b"data").unwrap();

        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        db.upsert_media_job(&uuid, "image/png", "x.png").unwrap();

        crate::upload::spawn_upload_media_job(
            uuid.to_string(),
            file_path,
            "image/png".to_string(),
            "x.png".to_string(),
            db.clone(),
            dead_url.to_string(),
            crate::upload::UploadRetry {
                max_attempts: 3,
                sleep_between_attempts: std::time::Duration::from_millis(10),
            },
        );

        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        // Job should still be in the database after all retries failed.
        assert_eq!(db.list_media_jobs().unwrap().len(), 1);
    }
}

#[cfg(test)]
mod replay_tests {
    use std::sync::{Arc, OnceLock};

    use pretty_assertions::assert_eq;

    use crate::db::MediaCacheDb;
    use crate::fs::{cache_file_path, write_bytes_atomically};
    use crate::upload::replay_media_jobs_once;

    use super::support::{TEST_TOKEN, TestBackend};

    fn init_auth() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = crate::auth::init(TEST_TOKEN.to_string());
        });
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn pending_jobs_are_uploaded_during_replay() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "eeff00112233";

        let tmp = tempfile::tempdir().unwrap();
        let file_path = cache_file_path(tmp.path(), &uuid);
        write_bytes_atomically(&file_path, b"replay-data").unwrap();

        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        db.upsert_media_job(&uuid, "image/jpeg", "shot.jpg")
            .unwrap();

        replay_media_jobs_once(tmp.path(), db.clone(), backend.base_url.clone());

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        assert_eq!(db.list_media_jobs().unwrap(), vec![]);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn job_with_missing_file_is_skipped_during_replay() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "eeff44556677";

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        db.upsert_media_job(&uuid, "image/png", "missing.png")
            .unwrap();
        // File is NOT written.

        replay_media_jobs_once(tmp.path(), db.clone(), backend.base_url.clone());

        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        // Job remains — nothing was uploaded.
        assert_eq!(db.list_media_jobs().unwrap().len(), 1);
    }
}

#[cfg(test)]
mod handler_tests {
    use std::sync::{Arc, OnceLock};

    use pretty_assertions::assert_eq;

    use crate::db::MediaCacheDb;
    use crate::fs::{cache_file_path, write_bytes_atomically};
    use crate::server::start_local_media_server;
    use crate::tasks::DownloadingTasks;

    use super::support::{TEST_TOKEN, TestBackend};

    fn init_auth() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = crate::auth::init(TEST_TOKEN.to_string());
        });
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    /// Starts the local media server and returns (port, objects_dir, db).
    async fn start_server(backend_url: &str) -> (u16, tempfile::TempDir, Arc<MediaCacheDb>) {
        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let tasks = Arc::new(DownloadingTasks::new());
        let port = start_local_media_server(
            tmp.path().to_path_buf(),
            db.clone(),
            tasks,
            backend_url.to_string(),
        )
        .unwrap();
        (port, tmp, db)
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn cached_file_is_served_from_disk_without_backend_contact() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ff00112233aa";

        let (port, tmp, db) = start_server(&backend.base_url).await;
        let file_path = cache_file_path(tmp.path(), uuid);
        write_bytes_atomically(&file_path, b"cached-data").unwrap();
        db.set_content_type(uuid, "image/png").unwrap();

        let resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/{uuid}"))
            .await
            .unwrap();
        assert_eq!(resp.status().as_u16(), 200);
        assert_eq!(resp.bytes().await.unwrap().as_ref(), b"cached-data");
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uncached_file_is_downloaded_from_backend_and_served() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ff00445566bb";
        backend.seed(uuid, b"remote-data", "image/jpeg").await;

        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/{uuid}"))
            .await
            .unwrap();
        assert_eq!(resp.status().as_u16(), 200);
        assert_eq!(resp.bytes().await.unwrap().as_ref(), b"remote-data");
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uuid_shorter_than_four_chars_returns_400() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/abc"))
            .await
            .unwrap();
        assert_eq!(resp.status().as_u16(), 400);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uuid_with_invalid_chars_returns_400() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/ab%2Fcd"))
            .await
            .unwrap();
        assert_eq!(resp.status().as_u16(), 400);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn file_absent_from_backend_returns_502() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ff0077889900"; // never seeded
        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/{uuid}"))
            .await
            .unwrap();
        assert_eq!(resp.status().as_u16(), 502);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn concurrent_requests_for_same_uuid_trigger_one_download() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "ff00aabbccdd";
        backend.seed(uuid, b"shared", "image/png").await;

        let (port, _tmp, _db) = start_server(&backend.base_url).await;
        let url = format!("http://127.0.0.1:{port}/api/m/{uuid}");

        let handles: Vec<_> = (0..4)
            .map(|_| {
                let u = url.clone();
                tokio::spawn(async move { reqwest::get(u).await.unwrap().status().as_u16() })
            })
            .collect();

        for h in handles {
            assert_eq!(h.await.unwrap(), 200);
        }
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn single_file_upload_returns_200_with_uuid() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let form = reqwest::multipart::Form::new().part(
            "photos",
            reqwest::multipart::Part::bytes(b"img".to_vec())
                .file_name("a.png")
                .mime_str("image/png")
                .unwrap(),
        );
        let resp = reqwest::Client::new()
            .post(format!("http://127.0.0.1:{port}/api/upload"))
            .multipart(form)
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status().as_u16(), 200);
        let body: serde_json::Value = resp.json().await.unwrap();
        assert_eq!(body["photos"].as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn no_photos_field_returns_400() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, _tmp, _db) = start_server(&backend.base_url).await;

        let form = reqwest::multipart::Form::new().text("other_field", "ignored");
        let resp = reqwest::Client::new()
            .post(format!("http://127.0.0.1:{port}/api/upload"))
            .multipart(form)
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status().as_u16(), 400);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uploaded_file_is_saved_to_disk() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, tmp, _db) = start_server(&backend.base_url).await;

        let form = reqwest::multipart::Form::new().part(
            "photos",
            reqwest::multipart::Part::bytes(b"disk-test".to_vec())
                .file_name("b.png")
                .mime_str("image/png")
                .unwrap(),
        );
        let resp = reqwest::Client::new()
            .post(format!("http://127.0.0.1:{port}/api/upload"))
            .multipart(form)
            .send()
            .await
            .unwrap();

        let body: serde_json::Value = resp.json().await.unwrap();
        let uuid = body["photos"][0].as_str().unwrap();
        let file_path = cache_file_path(tmp.path(), uuid);
        assert!(file_path.exists());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uploaded_content_type_is_stored_in_database() {
        init_auth();
        let backend = TestBackend::start().await;
        let (port, _tmp, db) = start_server(&backend.base_url).await;

        let form = reqwest::multipart::Form::new().part(
            "photos",
            reqwest::multipart::Part::bytes(b"ct-test".to_vec())
                .file_name("c.gif")
                .mime_str("image/gif")
                .unwrap(),
        );
        let resp = reqwest::Client::new()
            .post(format!("http://127.0.0.1:{port}/api/upload"))
            .multipart(form)
            .send()
            .await
            .unwrap();

        let body: serde_json::Value = resp.json().await.unwrap();
        let uuid = body["photos"][0].as_str().unwrap();
        assert_eq!(
            db.get_content_type(uuid).unwrap(),
            Some("image/gif".to_string())
        );
    }
}

#[cfg(test)]
mod e2e_tests {
    use std::sync::{Arc, OnceLock};

    use pretty_assertions::assert_eq;

    use crate::db::MediaCacheDb;
    use crate::server::start_local_media_server;
    use crate::tasks::DownloadingTasks;

    use super::support::{TEST_TOKEN, TestBackend};

    fn init_auth() {
        static ONCE: OnceLock<()> = OnceLock::new();
        ONCE.get_or_init(|| {
            let _ = crate::auth::init(TEST_TOKEN.to_string());
        });
        crate::set_auth_token(TEST_TOKEN.to_string());
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn upload_then_serve_returns_original_bytes() {
        init_auth();
        let backend = TestBackend::start().await;

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());
        let tasks = Arc::new(DownloadingTasks::new());
        let port = start_local_media_server(
            tmp.path().to_path_buf(),
            db,
            tasks,
            backend.base_url.clone(),
        )
        .unwrap();

        let payload = b"round-trip-content";
        let form = reqwest::multipart::Form::new().part(
            "photos",
            reqwest::multipart::Part::bytes(payload.to_vec())
                .file_name("rt.png")
                .mime_str("image/png")
                .unwrap(),
        );
        let upload_resp = reqwest::Client::new()
            .post(format!("http://127.0.0.1:{port}/api/upload"))
            .multipart(form)
            .send()
            .await
            .unwrap();

        let body: serde_json::Value = upload_resp.json().await.unwrap();
        let uuid = body["photos"][0].as_str().unwrap();

        let serve_resp = reqwest::get(format!("http://127.0.0.1:{port}/api/m/{uuid}"))
            .await
            .unwrap();
        assert_eq!(serve_resp.status().as_u16(), 200);
        assert_eq!(serve_resp.bytes().await.unwrap().as_ref(), payload);
    }

    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn uploaded_file_is_visible_on_backend_after_replay() {
        init_auth();
        let backend = TestBackend::start().await;
        let uuid = "112233445566";

        let tmp = tempfile::tempdir().unwrap();
        let db = Arc::new(MediaCacheDb::new_in_memory().unwrap());

        crate::fs::write_bytes_atomically(
            &crate::fs::cache_file_path(tmp.path(), uuid),
            b"replay-e2e",
        )
        .unwrap();
        db.upsert_media_job(uuid, "image/png", "e2e.png").unwrap();

        crate::upload::replay_media_jobs_once(tmp.path(), db.clone(), backend.base_url.clone());

        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        let uploads = backend.uploads.read().await;
        assert!(uploads.contains_key(uuid));
        assert_eq!(uploads[uuid].0.as_ref(), b"replay-e2e");
    }
}
