/// Tracks whether a locally cached record has been pushed to the server.
///
/// Stored as an INTEGER column in SQLite. All upsert operations require an
/// explicit status so callers can't accidentally leave a record in an ambiguous state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncStatus {
    Synced = 0,
    Pending = 1,
}
