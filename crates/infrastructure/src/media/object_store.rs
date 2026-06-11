use bytes::Bytes;
use only_application::ObjectStoreError;
use s3::Bucket;
use s3::Region;
use s3::creds::Credentials;
use thiserror::Error;

use crate::media::config::MinioConfig;

/// Errors produced during S3 client initialisation.
#[derive(Debug, Error)]
pub enum MinioInitError {
    #[error("invalid S3 credentials: {source}")]
    Credentials {
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    #[error("failed to build S3 bucket client: {source}")]
    BucketBuild {
        source: Box<dyn std::error::Error + Send + Sync>,
    },
}

/// S3-compatible (MinIO) implementation of [`only_application::ObjectStore`].
pub struct MinioObjectStore {
    bucket: Box<Bucket>,
    presign_expiry: std::time::Duration,
}

impl MinioObjectStore {
    /// Builds a connected S3 bucket client from the provided configuration.
    ///
    /// Uses a custom endpoint so the client works against MinIO or any
    /// S3-compatible store, and forces path-style addressing as required by MinIO.
    pub fn new(config: MinioConfig) -> Result<Self, MinioInitError> {
        let scheme = if config.use_ssl { "https" } else { "http" };
        let region = Region::Custom {
            region: "us-east-1".to_owned(),
            endpoint: format!("{scheme}://{}", config.endpoint),
        };

        let credentials = Credentials::new(
            Some(&config.access_key_id),
            Some(&config.secret_access_key),
            None,
            None,
            None,
        )
        .map_err(|e| MinioInitError::Credentials {
            source: Box::new(e),
        })?;

        let bucket = Bucket::new(&config.bucket, region, credentials)
            .map_err(|e| MinioInitError::BucketBuild {
                source: Box::new(e),
            })?
            .with_path_style();

        Ok(Self {
            bucket,
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
        self.bucket
            .put_object_with_content_type(key, &data, content_type)
            .await
            .map_err(|e| ObjectStoreError::Upload {
                key: key.to_string(),
                source: Box::new(e),
            })?;

        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<(), ObjectStoreError> {
        self.bucket
            .delete_object(key)
            .await
            .map_err(|e| ObjectStoreError::Delete {
                key: key.to_string(),
                source: Box::new(e),
            })?;

        Ok(())
    }

    async fn presign(&self, key: &str) -> Result<String, ObjectStoreError> {
        let expiry_secs = self.presign_expiry.as_secs() as u32;

        self.bucket
            .presign_get(key, expiry_secs, None)
            .await
            .map_err(|e| ObjectStoreError::Presign {
                key: key.to_string(),
                source: Box::new(e),
            })
    }
}
