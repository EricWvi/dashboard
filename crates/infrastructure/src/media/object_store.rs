use bytes::Bytes;
use futures::stream;
use http::Method;
use minio::s3::MinioClient;
use minio::s3::builders::ObjectContent;
use minio::s3::creds::StaticProvider;
use minio::s3::http::BaseUrl;
use minio::s3::types::S3Api;
use only_application::ObjectStoreError;
use thiserror::Error;

use crate::media::config::MinioConfig;

/// Errors produced during MinIO client initialisation.
#[derive(Debug, Error)]
pub enum MinioInitError {
    #[error("invalid MinIO endpoint: {source}")]
    InvalidEndpoint {
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("failed to build MinIO client: {source}")]
    ClientBuild {
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

/// MinIO-backed implementation of [`only_application::ObjectStore`].
pub struct MinioObjectStore {
    client: MinioClient,
    bucket: String,
    presign_expiry: std::time::Duration,
}

impl MinioObjectStore {
    /// Builds a connected MinIO client from the provided configuration.
    ///
    /// The endpoint is turned into a full URL so `BaseUrl` can infer the protocol
    /// based on the `use_ssl` flag.
    pub fn new(config: MinioConfig) -> Result<Self, MinioInitError> {
        let scheme = if config.use_ssl { "https" } else { "http" };
        let base_url: BaseUrl = format!("{scheme}://{}", config.endpoint).parse().map_err(
            |e: minio::s3::error::ValidationErr| MinioInitError::InvalidEndpoint {
                source: Box::new(e),
            },
        )?;

        let provider = StaticProvider::new(&config.access_key_id, &config.secret_access_key, None);

        let client = MinioClient::new(base_url, Some(provider), None, None).map_err(|e| {
            MinioInitError::ClientBuild {
                source: Box::new(e),
            }
        })?;

        Ok(Self {
            client,
            bucket: config.bucket,
            presign_expiry: config.presign_expiry,
        })
    }
}

impl only_application::ObjectStore for MinioObjectStore {
    async fn upload(
        &self,
        key: &str,
        data: Bytes,
        content_type: &str,
    ) -> Result<(), ObjectStoreError> {
        let size = data.len() as u64;
        let content = ObjectContent::new_from_stream(
            stream::once(async move { Ok::<_, std::io::Error>(data) }),
            size,
        );

        self.client
            .put_object_content(&self.bucket, key, content)
            .map_err(|e| ObjectStoreError::Upload {
                key: key.to_string(),
                source: Box::new(e),
            })?
            .content_type(Some(content_type.to_string()))
            .build()
            .send()
            .await
            .map_err(|e| ObjectStoreError::Upload {
                key: key.to_string(),
                source: Box::new(e),
            })?;

        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<(), ObjectStoreError> {
        self.client
            .delete_object(&self.bucket, key)
            .map_err(|e| ObjectStoreError::Delete {
                key: key.to_string(),
                source: Box::new(e),
            })?
            .build()
            .send()
            .await
            .map_err(|e| ObjectStoreError::Delete {
                key: key.to_string(),
                source: Box::new(e),
            })?;

        Ok(())
    }

    async fn presign(&self, key: &str) -> Result<String, ObjectStoreError> {
        let expiry_secs = self.presign_expiry.as_secs() as u32;

        let resp = self
            .client
            .get_presigned_object_url(&self.bucket, key, Method::GET)
            .map_err(|e| ObjectStoreError::Presign {
                key: key.to_string(),
                source: Box::new(e),
            })?
            .expiry_seconds(Some(expiry_secs))
            .build()
            .send()
            .await
            .map_err(|e| ObjectStoreError::Presign {
                key: key.to_string(),
                source: Box::new(e),
            })?;

        Ok(resp.url)
    }
}
