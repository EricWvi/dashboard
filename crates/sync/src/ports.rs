use std::future::Future;

use crate::error::SyncError;
use crate::schema::{EntrySchemaV1, SchemaDescriptor, TagSchemaV1, TiptapSchemaV1};

/// Payload returned by the server for both incremental pull and full sync.
/// The shapes are identical; a single type is used for both operations.
#[derive(Debug, Clone, Default)]
pub struct SyncPayload {
    /// Global server-side sequence number to persist as `lastServerVersion` after a successful pull.
    pub server_version: i64,
    pub entries: Vec<EntrySchemaV1>,
    pub tags: Vec<TagSchemaV1>,
    pub tiptaps: Vec<TiptapSchemaV1>,
}

impl SyncPayload {
    /// Returns `true` when the server sent no data records across all schemas.
    /// An empty payload triggers pull backoff rather than a server-version advance.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty() && self.tags.is_empty() && self.tiptaps.is_empty()
    }
}

/// Records being pushed from local storage to the server.
#[derive(Debug, Clone, Default)]
pub struct PushPayload {
    pub entries: Vec<EntrySchemaV1>,
    pub tags: Vec<TagSchemaV1>,
    pub tiptaps: Vec<TiptapSchemaV1>,
}

impl PushPayload {
    /// Returns `true` when there are no pending records in any schema.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty() && self.tags.is_empty() && self.tiptaps.is_empty()
    }
}

/// Response from the server after a push, listing which schemas were actually processed.
///
/// Schemas absent from `processed_schemas` were skipped by the server (e.g., the schema
/// version is no longer supported). Records for skipped schemas must remain in pending state.
#[derive(Debug, Clone, Default)]
pub struct PushResult {
    pub processed_schemas: Vec<SchemaDescriptor>,
}

/// Remote HTTP transport, implemented by the Android networking layer.
///
/// Each method translates between the sync protocol (schema descriptors + payloads) and
/// the actual HTTP endpoints. `SyncModule` calls these methods without knowing about HTTP
/// status codes, authentication, or serialization details.
pub trait SyncServerPort: Send + Sync {
    /// Verifies that every schema version declared in `SUPPORTED_SCHEMAS` is still
    /// recognized by the server. Returns `SyncError::SchemaUnsupported` if any are rejected.
    fn reconcile(
        &self,
        schemas: &[SchemaDescriptor],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Fetches all records for the given schemas. Used for first-time sync only.
    fn full_sync(
        &self,
        schemas: &[SchemaDescriptor],
    ) -> impl Future<Output = Result<SyncPayload, SyncError>> + Send;

    /// Fetches incremental records changed after `since` (a server-version sequence number).
    /// The server filters its response to only the requested schema versions.
    fn pull(
        &self,
        schemas: &[SchemaDescriptor],
        since: i64,
    ) -> impl Future<Output = Result<SyncPayload, SyncError>> + Send;

    /// Uploads local pending changes. The server skips schemas it no longer supports and
    /// reports which schemas it actually processed in `PushResult.processed_schemas`.
    fn push(
        &self,
        schemas: &[SchemaDescriptor],
        changes: PushPayload,
    ) -> impl Future<Output = Result<PushResult, SyncError>> + Send;
}

/// Local SQLite storage, implemented by the Android persistence layer.
///
/// All methods operate on schema types; the implementation owns the SQLite ↔ schema mapping.
///
/// Contract for `upsert_*`: only overwrite a local record when `remote.updated_at >
/// local.updated_at` (Last-Write-Wins). When `is_deleted = true` on an incoming record,
/// physically remove the local row regardless of timestamps.
pub trait SyncLocalPort: Send + Sync {
    // --- Full sync ---

    /// Removes all local journal data in preparation for a full server download.
    fn clear_all_data(&self) -> impl Future<Output = Result<(), SyncError>> + Send;

    // --- Push: collect pending records ---

    /// Returns entry records whose sync status is pending (not yet confirmed by the server).
    fn pending_entries(&self) -> impl Future<Output = Result<Vec<EntrySchemaV1>, SyncError>> + Send;

    /// Returns tag records whose sync status is pending.
    fn pending_tags(&self) -> impl Future<Output = Result<Vec<TagSchemaV1>, SyncError>> + Send;

    /// Returns Tiptap records whose sync status is pending.
    fn pending_tiptaps(
        &self,
    ) -> impl Future<Output = Result<Vec<TiptapSchemaV1>, SyncError>> + Send;

    // --- Push: mark confirmed records as synced ---

    /// Marks entries as synced. The `(id, updated_at)` pair guards against marking a record
    /// that was locally modified between collection and the server's confirmation arriving.
    fn mark_entries_synced(
        &self,
        records: &[(String, i64)],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Marks tags as synced using `(id, updated_at)` pairs.
    fn mark_tags_synced(
        &self,
        records: &[(String, i64)],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Marks Tiptap documents as synced using `(id, updated_at)` pairs.
    fn mark_tiptaps_synced(
        &self,
        records: &[(String, i64)],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    // --- Pull / Full: apply remote records ---

    /// Applies remote entry records to local storage with LWW + is_deleted semantics.
    fn upsert_entries(
        &self,
        rows: &[EntrySchemaV1],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Applies remote tag records to local storage with LWW + is_deleted semantics.
    fn upsert_tags(
        &self,
        rows: &[TagSchemaV1],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    /// Applies remote Tiptap records to local storage with LWW + is_deleted semantics.
    fn upsert_tiptaps(
        &self,
        rows: &[TiptapSchemaV1],
    ) -> impl Future<Output = Result<(), SyncError>> + Send;

    // --- Sync state ---

    /// Returns the last server-side sequence number received from the server, or 0 if
    /// no sync has been performed yet.
    fn server_version(&self) -> impl Future<Output = Result<i64, SyncError>> + Send;

    /// Persists the server-side sequence number after a successful pull.
    fn save_server_version(&self, v: i64) -> impl Future<Output = Result<(), SyncError>> + Send;
}
