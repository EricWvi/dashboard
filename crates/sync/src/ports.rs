use std::future::Future;

use only_sync_schema::SchemaDescriptor;

pub use only_sync_schema::PushResult;

use crate::error::SyncError;

/// Remote HTTP transport, implemented by the Android networking layer.
///
/// Generic over the app-specific push and pull payload types. Each method translates
/// between the sync protocol and the actual HTTP endpoints; `SyncModule` calls these
/// without knowing about HTTP status codes, authentication, or serialization details.
pub trait SyncServerPort<PushData: Send, PullData: Send>: Send + Sync {
    /// Verifies that every schema version in `schemas` is still recognized by the server.
    /// Returns `SyncError::SchemaUnsupported` if any are rejected.
    fn reconcile(
        &self,
        schemas: &[SchemaDescriptor],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Fetches all records for the given schemas. Used for first-time sync only.
    fn full_sync(
        &self,
        schemas: &[SchemaDescriptor],
    ) -> impl Future<Output = Result<PullData, SyncError>> + Send;

    /// Fetches incremental records changed after `since` (a server-version sequence number).
    fn pull(
        &self,
        schemas: &[SchemaDescriptor],
        since: i64,
    ) -> impl Future<Output = Result<PullData, SyncError>> + Send;

    /// Uploads local pending changes. Takes a reference so the caller retains the data
    /// for marking records synced after confirmation.
    fn push(
        &self,
        schemas: &[SchemaDescriptor],
        data: &PushData,
    ) -> impl Future<Output = Result<PushResult, SyncError>> + Send;
}

/// Local SQLite storage, implemented by the Android persistence layer.
///
/// Each app defines its own `PushData` and `PullData` types containing only the schemas
/// that app supports. `SyncModule` is fully generic over these types and never inspects
/// their contents directly.
///
/// Contract for `apply_pull`: only overwrite a local record when `remote.updated_at >
/// local.updated_at` (Last-Write-Wins). When `is_deleted = true` on an incoming record,
/// physically remove the local row regardless of timestamps.
pub trait SyncLocalPort: Send + Sync {
    /// App-specific type holding all locally pending records to push.
    type PushData: Send;

    /// App-specific type holding all records received from a pull or full sync.
    type PullData: Send;

    /// Returns the schema versions this app declares to the server.
    /// Called before every reconcile, push, and pull.
    fn supported_schemas(&self) -> Vec<SchemaDescriptor>;

    /// Returns `true` when `data` contains no pending records in any schema.
    fn push_is_empty(data: &Self::PushData) -> bool;

    /// Returns `true` when `data` contains no records in any schema.
    /// An empty pull response triggers backoff rather than a server-version advance.
    fn pull_is_empty(data: &Self::PullData) -> bool;

    /// Extracts the global server-side sequence number from a pull response.
    fn pull_server_version(data: &Self::PullData) -> i64;

    /// Collects all locally pending records for push.
    fn pending_push(&self) -> impl Future<Output = Result<Self::PushData, SyncError>> + Send;

    /// Marks locally pending records as synced for every schema listed in
    /// `result.processed_schemas`. Records whose schema was not processed must remain pending.
    fn apply_push_result(
        &self,
        data: &Self::PushData,
        result: &PushResult,
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Applies remote records to local storage with LWW + is_deleted semantics.
    fn apply_pull(
        &self,
        data: Self::PullData,
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Removes all local data in preparation for a full server download.
    fn clear_all_data(&self) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Returns the last server-side sequence number received from the server, or 0 if
    /// no sync has been performed yet.
    fn server_version(&self) -> impl Future<Output = Result<i64, SyncError>> + Send;

    /// Persists the server-side sequence number after a successful pull.
    fn save_server_version(&self, v: i64) -> impl Future<Output = Result<(), SyncError>> + Send;
}
