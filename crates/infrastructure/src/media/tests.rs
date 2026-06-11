#[cfg(test)]
mod tests {
    use bytes::Bytes;
    use only_application::ObjectStore;
    use pretty_assertions::assert_eq;
    use s3::creds::Credentials;
    use s3::{Bucket, BucketConfiguration, Region};
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
        admin: Box<Bucket>,
    }

    fn make_credentials() -> Credentials {
        Credentials::new(Some(ACCESS_KEY), Some(SECRET_KEY), None, None, None).unwrap()
    }

    /// Starts a containerized MinIO instance, creates the test bucket, and returns a ready fixture.
    async fn start_fixture() -> MinioFixture {
        let container = MinIO::default().start().await.unwrap();
        let port = container.get_host_port_ipv4(9000).await.unwrap();
        let endpoint = format!("127.0.0.1:{port}");

        let region = Region::Custom {
            region: "us-east-1".to_owned(),
            endpoint: format!("http://{endpoint}"),
        };

        Bucket::create_with_path_style(
            BUCKET,
            region.clone(),
            make_credentials(),
            BucketConfiguration::default(),
        )
        .await
        .unwrap();

        let admin = Bucket::new(BUCKET, region, make_credentials())
            .unwrap()
            .with_path_style();

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
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
    async fn upload_stores_object_with_correct_size() {
        let fixture = start_fixture().await;
        let data = Bytes::from_static(b"hello, minio");

        fixture
            .store
            .upload("images/hello.jpg", data.clone(), "image/jpeg")
            .await
            .unwrap();

        let (head, _status) = fixture.admin.head_object("images/hello.jpg").await.unwrap();

        assert_eq!(head.content_length, Some(data.len() as i64));
    }

    /// Verifies that delete removes the object so a subsequent head returns a 404 error.
    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
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

        let result = fixture.admin.head_object("files/remove-me.txt").await;
        assert!(result.is_err());
    }

    /// Verifies that presign returns a signed URL encoding the object key and an AWS v4 signature.
    #[tokio::test]
    #[ignore = "requires RUN_TESTCONTAINERS=1"]
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
