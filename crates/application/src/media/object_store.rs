use std::future::Future;

use bytes::Bytes;

use crate::media::error::ObjectStoreError;

/// Abstraction over a binary object store (e.g. MinIO, S3).
///
/// Implementors are expected to be cheap to clone or wrap in an [`std::sync::Arc`].
/// All methods take `&self` so the store can be shared across concurrent handlers.
/// The explicit `+ Send` bound on each returned future ensures the store is usable
/// inside the `BoxFuture` required by the scheduler's `Job` trait.
pub trait ObjectStore: Send + Sync {
    /// Uploads `data` under `key` with the given MIME `content_type`.
    fn upload(
        &self,
        key: &str,
        data: Bytes,
        content_type: &str,
    ) -> impl Future<Output = Result<(), ObjectStoreError>> + Send;

    /// Permanently removes the object identified by `key`.
    fn delete(&self, key: &str) -> impl Future<Output = Result<(), ObjectStoreError>> + Send;

    /// Returns a time-limited pre-signed GET URL for the object at `key`.
    fn presign(&self, key: &str) -> impl Future<Output = Result<String, ObjectStoreError>> + Send;
}

impl<O: ObjectStore + ?Sized> ObjectStore for std::sync::Arc<O> {
    fn upload(
        &self,
        key: &str,
        data: Bytes,
        content_type: &str,
    ) -> impl Future<Output = Result<(), ObjectStoreError>> + Send {
        (**self).upload(key, data, content_type)
    }

    fn delete(&self, key: &str) -> impl Future<Output = Result<(), ObjectStoreError>> + Send {
        (**self).delete(key)
    }

    fn presign(&self, key: &str) -> impl Future<Output = Result<String, ObjectStoreError>> + Send {
        (**self).presign(key)
    }
}
