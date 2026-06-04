#[cfg(test)]
mod tests {
    use bytes::Bytes;
    use minio::s3::MinioClient;
    use minio::s3::creds::StaticProvider;
    use minio::s3::error::{Error as MinioError, S3ServerError};
    use minio::s3::http::BaseUrl;
    use minio::s3::types::S3Api;
    use minio::s3::types::minio_error_response::MinioErrorCode;
    use only_application::ObjectStore;
    use pretty_assertions::assert_eq;
    use testcontainers::ContainerAsync;
    use testcontainers::runners::AsyncRunner;
    use testcontainers_modules::minio::MinIO;

    use crate::media::MinioConfig;
    use crate::media::MinioObjectStore;

    const BUCKET: &str = "test-bucket";
    const ACCESS_KEY: &str = "minioadmin";
    const SECRET_KEY: &str = "minioadmin";

    struct MinioFixture {
        /// Keeps the container alive for the duration of each test.
        _container: ContainerAsync<MinIO>,
        store: MinioObjectStore,
        admin: MinioClient,
    }

    /// Starts a containerized MinIO instance, creates the test bucket, and returns a ready fixture.
    async fn start_fixture() -> MinioFixture {
        let container = MinIO::default().start().await.unwrap();
        let port = container.get_host_port_ipv4(9000).await.unwrap();
        let endpoint = format!("127.0.0.1:{port}");

        let base_url: BaseUrl = format!("http://{endpoint}").parse().unwrap();
        let provider = StaticProvider::new(ACCESS_KEY, SECRET_KEY, None);
        let admin = MinioClient::new(base_url, Some(provider), None, None).unwrap();

        admin
            .create_bucket(BUCKET)
            .unwrap()
            .build()
            .send()
            .await
            .unwrap();

        let store = MinioObjectStore::new(MinioConfig {
            endpoint,
            bucket: BUCKET.to_string(),
            access_key_id: ACCESS_KEY.to_string(),
            secret_access_key: SECRET_KEY.to_string(),
            use_ssl: false,
            presign_expiry: std::time::Duration::from_secs(3600),
        })
        .unwrap();

        MinioFixture {
            _container: container,
            store,
            admin,
        }
    }

    /// Verifies that upload stores an object at the specified key with the correct byte count.
    #[tokio::test]
    async fn upload_stores_object_with_correct_size() {
        let fixture = start_fixture().await;
        let data = Bytes::from_static(b"hello, minio");

        fixture
            .store
            .upload("images/hello.jpg", data.clone(), "image/jpeg")
            .await
            .unwrap();

        let stat = fixture
            .admin
            .stat_object(BUCKET, "images/hello.jpg")
            .unwrap()
            .build()
            .send()
            .await
            .unwrap();

        assert_eq!(stat.size().unwrap(), data.len() as u64);
    }

    /// Verifies that delete removes the object so a subsequent stat returns NoSuchKey.
    #[tokio::test]
    async fn delete_removes_object_from_bucket() {
        let fixture = start_fixture().await;

        fixture
            .store
            .upload(
                "files/remove-me.txt",
                Bytes::from_static(b"bye"),
                "text/plain",
            )
            .await
            .unwrap();

        fixture.store.delete("files/remove-me.txt").await.unwrap();

        let error = fixture
            .admin
            .stat_object(BUCKET, "files/remove-me.txt")
            .unwrap()
            .build()
            .send()
            .await
            .unwrap_err();

        assert_eq!(
            matches!(
                &error,
                MinioError::S3Server(S3ServerError::S3Error(resp))
                    if resp.code() == MinioErrorCode::NoSuchKey
            ),
            true
        );
    }

    /// Verifies that presign returns a signed URL encoding the object key and an AWS v4 signature.
    #[tokio::test]
    async fn presign_returns_signed_url_for_object() {
        let fixture = start_fixture().await;

        fixture
            .store
            .upload(
                "docs/report.pdf",
                Bytes::from_static(b"pdf-content"),
                "application/pdf",
            )
            .await
            .unwrap();

        let url = fixture.store.presign("docs/report.pdf").await.unwrap();

        assert_eq!(url.contains("report.pdf"), true);
        assert_eq!(url.contains("X-Amz-Signature"), true);
    }
}
