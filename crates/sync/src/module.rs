use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use only_logging::{only_error, only_info, only_warn};

use crate::error::SyncError;
use crate::ports::{SyncLocalPort, SyncServerPort};

const MAX_WAIT_MS: i64 = 30_000;

/// Returned by `full_sync` and `sync` to indicate whether the operation ran or was skipped.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncOutcome {
    Completed,
    /// Another sync operation was already in progress; this call was a no-op.
    AlreadyInProgress,
}

/// Provides the current wall-clock time in milliseconds since the Unix epoch.
/// Injected into `SyncModule` so tests can control time deterministically.
pub trait Clock: Send + Sync {
    fn now_ms(&self) -> i64;
}

/// Production clock backed by `std::time::SystemTime`.
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_ms(&self) -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }
}

/// Internal result of the push phase within a sync cycle.
enum PushOutcome {
    /// Records were collected, sent, and (partially or fully) confirmed.
    Pushed,
    /// No pending records existed; the server was not contacted.
    NothingToPush,
}

struct SyncState {
    /// Current backoff wait interval in milliseconds. Doubles on failure up to `MAX_WAIT_MS`.
    wait_ms: i64,
    /// Wall-clock timestamp (ms) before which pull is skipped. Set to 0 after a push success.
    next_pull_ms: i64,
}

/// Client-side orchestrator that drives reconcile, full sync, push, and pull against two
/// port abstractions. Holds the concurrency guard and backoff state.
///
/// The Android layer creates one instance per session, calls `reconcile()` at startup,
/// then drives `need_full_sync()` / `full_sync()` / `sync()` on its own schedule.
pub struct SyncModule<S, L, C = SystemClock> {
    server: S,
    local: L,
    clock: C,
    base_interval_ms: i64,
    is_syncing: AtomicBool,
    state: Mutex<SyncState>,
}

impl<S, L> SyncModule<S, L, SystemClock>
where
    L: SyncLocalPort,
    S: SyncServerPort<L::PushData, L::PullData>,
{
    /// Creates a sync module with the production system clock and a 3-second base interval.
    pub fn new(server: S, local: L) -> Self {
        Self::with_clock(server, local, SystemClock)
    }
}

impl<S, L, C> SyncModule<S, L, C>
where
    L: SyncLocalPort,
    S: SyncServerPort<L::PushData, L::PullData>,
    C: Clock,
{
    /// Creates a sync module with an injected clock. Intended for tests that need
    /// deterministic time control.
    pub fn with_clock(server: S, local: L, clock: C) -> Self {
        let base_interval_ms = 3_000;
        let now = clock.now_ms();
        Self {
            server,
            local,
            clock,
            base_interval_ms,
            is_syncing: AtomicBool::new(false),
            state: Mutex::new(SyncState {
                wait_ms: base_interval_ms,
                next_pull_ms: now + base_interval_ms,
            }),
        }
    }

    /// Verifies that all schemas returned by `supported_schemas()` are still recognized
    /// by the server. Called once at Android startup; on `SyncError::SchemaUnsupported`
    /// the app should halt.
    pub async fn reconcile(&self) -> Result<(), SyncError> {
        let schemas = self.local.supported_schemas();
        self.server.reconcile(&schemas).await
    }

    /// Returns `true` if no prior sync has been performed (`server_version == 0`).
    /// Used by Android immediately after a successful `reconcile` to decide whether to
    /// call `full_sync` or go straight to `sync`.
    pub async fn need_full_sync(&self) -> Result<bool, SyncError> {
        let v = self.local.server_version().await?;
        Ok(v == 0)
    }

    /// Fetches all data from the server, clears local storage, and bulk-inserts results.
    /// Errors are propagated so the Android caller can retry. Returns `AlreadyInProgress`
    /// if another sync operation is currently running.
    pub async fn full_sync(&self) -> Result<SyncOutcome, SyncError> {
        if self
            .is_syncing
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            return Ok(SyncOutcome::AlreadyInProgress);
        }
        let result = self.run_full_sync().await;
        self.is_syncing.store(false, Ordering::Release);
        result.map(|()| SyncOutcome::Completed)
    }

    async fn run_full_sync(&self) -> Result<(), SyncError> {
        let schemas = self.local.supported_schemas();
        let data = self.server.full_sync(&schemas).await?;
        self.local.clear_all_data().await?;
        let version = L::pull_server_version(&data);
        self.local.apply_pull(data).await?;
        self.local.save_server_version(version).await?;
        only_info!(server_version = version, "full sync complete");
        Ok(())
    }

    /// Runs push → pull in sequence. Errors are caught and converted to exponential backoff;
    /// the Android caller never needs to handle sync errors — it just reschedules on its timer.
    /// Returns `AlreadyInProgress` if another sync operation is currently running.
    pub async fn sync(&self) -> SyncOutcome {
        if self
            .is_syncing
            .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
            .is_err()
        {
            return SyncOutcome::AlreadyInProgress;
        }

        match self.run_push().await {
            Err(e) => {
                only_error!(error = %e, "push failed, applying backoff");
                self.apply_backoff();
                self.is_syncing.store(false, Ordering::Release);
                return SyncOutcome::Completed;
            }
            // Only reset backoff when records were actually sent; an empty push (nothing
            // pending) should not disturb the existing pull schedule.
            Ok(PushOutcome::Pushed) => self.reset_backoff(),
            Ok(PushOutcome::NothingToPush) => {}
        }

        if let Err(e) = self.run_pull().await {
            only_error!(error = %e, "pull failed, applying backoff");
            self.apply_backoff();
        }

        self.is_syncing.store(false, Ordering::Release);
        SyncOutcome::Completed
    }

    async fn run_push(&self) -> Result<PushOutcome, SyncError> {
        let data = self.local.pending_push().await?;
        if L::push_is_empty(&data) {
            return Ok(PushOutcome::NothingToPush);
        }
        let schemas = self.local.supported_schemas();
        let result = self.server.push(&schemas, &data).await?;
        // Mark-synced failures are non-fatal: the server already accepted the records,
        // so we log a warning rather than treating this as a push failure.
        if let Err(e) = self.local.apply_push_result(&data, &result).await {
            only_warn!(error = %e, "failed to mark records synced after push");
        }
        only_info!(processed = result.processed_schemas.len(), "push complete");
        Ok(PushOutcome::Pushed)
    }

    /// Checks the backoff window, fetches incremental changes, and applies them locally.
    /// An empty server response triggers backoff; a successful response resets the wait interval.
    async fn run_pull(&self) -> Result<(), SyncError> {
        let (now, next_pull_ms) = {
            let state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
            (self.clock.now_ms(), state.next_pull_ms)
        };
        if now < next_pull_ms {
            return Ok(());
        }

        let since = self.local.server_version().await?;
        let schemas = self.local.supported_schemas();
        let data = self.server.pull(&schemas, since).await?;

        if L::pull_is_empty(&data) {
            self.apply_backoff();
            return Ok(());
        }

        let version = L::pull_server_version(&data);
        self.local.apply_pull(data).await?;
        self.local.save_server_version(version).await?;

        {
            let mut state =
                self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
            state.wait_ms = self.base_interval_ms;
        }

        only_info!(server_version = version, "pull complete");
        Ok(())
    }

    fn apply_backoff(&self) {
        let now = self.clock.now_ms();
        let mut state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.wait_ms = (state.wait_ms * 2).min(MAX_WAIT_MS);
        state.next_pull_ms = now + state.wait_ms;
    }

    /// Resets backoff after a successful push so the pull runs immediately.
    fn reset_backoff(&self) {
        let mut state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.wait_ms = self.base_interval_ms;
        state.next_pull_ms = 0;
    }

    /// Simulates the guard being held by an in-flight operation. Test-only.
    #[cfg(test)]
    pub(crate) fn simulate_running(&self) {
        self.is_syncing.store(true, Ordering::SeqCst);
    }

    /// Returns the current backoff wait interval. Test-only.
    #[cfg(test)]
    pub(crate) fn wait_ms(&self) -> i64 {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .wait_ms
    }

    /// Resets backoff and allows pull to run immediately. Test-only.
    #[cfg(test)]
    pub(crate) fn reset_backoff_for_test(&self) {
        let mut state =
            self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.wait_ms = self.base_interval_ms;
        state.next_pull_ms = 0;
    }
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used)]

    use std::collections::VecDeque;
    use std::future::Future;
    use std::pin::Pin;
    use std::sync::Mutex;
    use std::sync::atomic::AtomicI64;

    use pretty_assertions::assert_eq;

    use super::*;
    use crate::error::SyncError;
    use crate::ports::{PushResult, SyncLocalPort, SyncServerPort};
    use only_sync_schema::{EntrySchemaV1, SchemaDescriptor, TagSchemaV1, TiptapSchemaV1};

    // ─── mock clock ─────────────────────────────────────────────────────────────

    struct MockClock(AtomicI64);

    impl MockClock {
        fn at(ms: i64) -> Self {
            Self(AtomicI64::new(ms))
        }
        fn advance(&self, ms: i64) {
            self.0.fetch_add(ms, std::sync::atomic::Ordering::SeqCst);
        }
    }

    impl Clock for MockClock {
        fn now_ms(&self) -> i64 {
            self.0.load(std::sync::atomic::Ordering::SeqCst)
        }
    }

    // ─── test-internal payload types ─────────────────────────────────────────────

    /// Push payload used by tests. Apps define their own equivalent types.
    #[derive(Debug, Clone, Default)]
    struct MockPushData {
        entries: Vec<EntrySchemaV1>,
        tags: Vec<TagSchemaV1>,
        tiptaps: Vec<TiptapSchemaV1>,
    }

    /// Pull payload used by tests. Apps define their own equivalent types.
    #[derive(Debug, Clone, Default)]
    struct MockPullData {
        server_version: i64,
        entries: Vec<EntrySchemaV1>,
        tags: Vec<TagSchemaV1>,
        tiptaps: Vec<TiptapSchemaV1>,
    }

    // ─── mock server ─────────────────────────────────────────────────────────────

    #[derive(Default)]
    struct MockServer {
        reconcile_q: Mutex<VecDeque<Result<(), SyncError>>>,
        full_sync_q: Mutex<VecDeque<Result<MockPullData, SyncError>>>,
        pull_q: Mutex<VecDeque<Result<MockPullData, SyncError>>>,
        push_q: Mutex<VecDeque<Result<PushResult, SyncError>>>,
        pull_since_log: Mutex<Vec<i64>>,
        push_call_log: Mutex<Vec<MockPushData>>,
    }

    impl MockServer {
        fn enqueue_reconcile(&self, r: Result<(), SyncError>) {
            self.reconcile_q.lock().unwrap().push_back(r);
        }
        fn enqueue_full_sync(&self, r: Result<MockPullData, SyncError>) {
            self.full_sync_q.lock().unwrap().push_back(r);
        }
        fn enqueue_pull(&self, r: Result<MockPullData, SyncError>) {
            self.pull_q.lock().unwrap().push_back(r);
        }
        fn enqueue_push(&self, r: Result<PushResult, SyncError>) {
            self.push_q.lock().unwrap().push_back(r);
        }
        fn pull_since_calls(&self) -> Vec<i64> {
            self.pull_since_log.lock().unwrap().clone()
        }
        fn push_calls(&self) -> Vec<MockPushData> {
            self.push_call_log.lock().unwrap().clone()
        }
        fn push_call_count(&self) -> usize {
            self.push_call_log.lock().unwrap().len()
        }
    }

    impl SyncServerPort<MockPushData, MockPullData> for MockServer {
        fn reconcile(
            &self,
            _schemas: &[SchemaDescriptor],
        ) -> impl Future<Output = Result<(), SyncError>> + Send {
            let result = self.reconcile_q.lock().unwrap().pop_front().unwrap_or(Ok(()));
            async move { result }
        }

        fn full_sync(
            &self,
            _schemas: &[SchemaDescriptor],
        ) -> impl Future<Output = Result<MockPullData, SyncError>> + Send {
            let result = self
                .full_sync_q
                .lock()
                .unwrap()
                .pop_front()
                .unwrap_or_else(|| Ok(MockPullData::default()));
            async move { result }
        }

        fn pull(
            &self,
            _schemas: &[SchemaDescriptor],
            since: i64,
        ) -> impl Future<Output = Result<MockPullData, SyncError>> + Send {
            self.pull_since_log.lock().unwrap().push(since);
            let result = self
                .pull_q
                .lock()
                .unwrap()
                .pop_front()
                .unwrap_or_else(|| Ok(MockPullData::default()));
            async move { result }
        }

        fn push(
            &self,
            _schemas: &[SchemaDescriptor],
            data: &MockPushData,
        ) -> impl Future<Output = Result<PushResult, SyncError>> + Send {
            self.push_call_log.lock().unwrap().push(data.clone());
            let result = self
                .push_q
                .lock()
                .unwrap()
                .pop_front()
                .unwrap_or_else(|| Ok(all_processed()));
            async move { result }
        }
    }

    // ─── mock local ──────────────────────────────────────────────────────────────

    #[derive(Default)]
    struct MockLocal {
        server_version: Mutex<i64>,
        saved_versions: Mutex<Vec<i64>>,
        pending_entries: Mutex<Vec<EntrySchemaV1>>,
        pending_tags: Mutex<Vec<TagSchemaV1>>,
        pending_tiptaps: Mutex<Vec<TiptapSchemaV1>>,
        upserted_entries: Mutex<Vec<EntrySchemaV1>>,
        pub upserted_tags: Mutex<Vec<TagSchemaV1>>,
        upserted_tiptaps: Mutex<Vec<TiptapSchemaV1>>,
        marked_entries: Mutex<Vec<(String, i64)>>,
        marked_tags: Mutex<Vec<(String, i64)>>,
        marked_tiptaps: Mutex<Vec<(String, i64)>>,
        cleared_count: Mutex<usize>,
        // Injects a storage failure into the next `apply_pull` call when set.
        apply_pull_error: Mutex<Option<SyncError>>,
    }

    impl MockLocal {
        fn with_server_version(version: i64) -> Self {
            let m = Self::default();
            *m.server_version.lock().unwrap() = version;
            m
        }
        fn set_pending_entries(&self, entries: Vec<EntrySchemaV1>) {
            *self.pending_entries.lock().unwrap() = entries;
        }
        fn set_pending_tags(&self, tags: Vec<TagSchemaV1>) {
            *self.pending_tags.lock().unwrap() = tags;
        }
        fn set_pending_tiptaps(&self, tiptaps: Vec<TiptapSchemaV1>) {
            *self.pending_tiptaps.lock().unwrap() = tiptaps;
        }
        fn inject_upsert_entries_error(&self, e: SyncError) {
            *self.apply_pull_error.lock().unwrap() = Some(e);
        }
        fn cleared_count(&self) -> usize {
            *self.cleared_count.lock().unwrap()
        }
        fn saved_versions(&self) -> Vec<i64> {
            self.saved_versions.lock().unwrap().clone()
        }
        fn upserted_entries(&self) -> Vec<EntrySchemaV1> {
            self.upserted_entries.lock().unwrap().clone()
        }
        fn marked_entries(&self) -> Vec<(String, i64)> {
            self.marked_entries.lock().unwrap().clone()
        }
        fn marked_tags(&self) -> Vec<(String, i64)> {
            self.marked_tags.lock().unwrap().clone()
        }
        fn marked_tiptaps(&self) -> Vec<(String, i64)> {
            self.marked_tiptaps.lock().unwrap().clone()
        }
    }

    impl SyncLocalPort for MockLocal {
        type PushData = MockPushData;
        type PullData = MockPullData;

        fn supported_schemas(&self) -> Vec<SchemaDescriptor> {
            vec![
                SchemaDescriptor::new("entry", 1),
                SchemaDescriptor::new("tag", 1),
                SchemaDescriptor::new("tiptap", 1),
            ]
        }

        fn push_is_empty(data: &MockPushData) -> bool {
            data.entries.is_empty() && data.tags.is_empty() && data.tiptaps.is_empty()
        }

        fn pull_is_empty(data: &MockPullData) -> bool {
            data.entries.is_empty() && data.tags.is_empty() && data.tiptaps.is_empty()
        }

        fn pull_server_version(data: &MockPullData) -> i64 {
            data.server_version
        }

        fn pending_push(&self) -> impl Future<Output = Result<MockPushData, SyncError>> + Send {
            let entries = self.pending_entries.lock().unwrap().clone();
            let tags = self.pending_tags.lock().unwrap().clone();
            let tiptaps = self.pending_tiptaps.lock().unwrap().clone();
            async move { Ok(MockPushData { entries, tags, tiptaps }) }
        }

        fn apply_push_result(
            &self,
            data: &MockPushData,
            result: &PushResult,
        ) -> impl Future<Output = Result<(), SyncError>> + Send {
            for schema in &result.processed_schemas {
                match schema.name.as_str() {
                    "entry" => {
                        let pairs: Vec<_> =
                            data.entries.iter().map(|e| (e.id.clone(), e.updated_at)).collect();
                        self.marked_entries.lock().unwrap().extend(pairs);
                    }
                    "tag" => {
                        let pairs: Vec<_> =
                            data.tags.iter().map(|t| (t.id.clone(), t.updated_at)).collect();
                        self.marked_tags.lock().unwrap().extend(pairs);
                    }
                    "tiptap" => {
                        let pairs: Vec<_> =
                            data.tiptaps.iter().map(|t| (t.id.clone(), t.updated_at)).collect();
                        self.marked_tiptaps.lock().unwrap().extend(pairs);
                    }
                    _ => {}
                }
            }
            async { Ok(()) }
        }

        fn apply_pull(
            &self,
            data: MockPullData,
        ) -> impl Future<Output = Result<(), SyncError>> + Send {
            let err = self.apply_pull_error.lock().unwrap().take();
            if let Some(e) = err {
                return Pin::from(
                    Box::new(async move { Err(e) })
                        as Box<dyn Future<Output = Result<(), SyncError>> + Send>,
                );
            }
            self.upserted_entries.lock().unwrap().extend(data.entries);
            self.upserted_tags.lock().unwrap().extend(data.tags);
            self.upserted_tiptaps.lock().unwrap().extend(data.tiptaps);
            Pin::from(
                Box::new(async { Ok(()) })
                    as Box<dyn Future<Output = Result<(), SyncError>> + Send>,
            )
        }

        fn clear_all_data(&self) -> impl Future<Output = Result<(), SyncError>> + Send {
            *self.cleared_count.lock().unwrap() += 1;
            async { Ok(()) }
        }

        fn server_version(&self) -> impl Future<Output = Result<i64, SyncError>> + Send {
            let v = *self.server_version.lock().unwrap();
            async move { Ok(v) }
        }

        fn save_server_version(
            &self,
            v: i64,
        ) -> impl Future<Output = Result<(), SyncError>> + Send {
            *self.server_version.lock().unwrap() = v;
            self.saved_versions.lock().unwrap().push(v);
            async { Ok(()) }
        }
    }

    // ─── helpers ─────────────────────────────────────────────────────────────────

    fn all_processed() -> PushResult {
        PushResult {
            processed_schemas: vec![
                SchemaDescriptor::new("entry", 1),
                SchemaDescriptor::new("tag", 1),
                SchemaDescriptor::new("tiptap", 1),
            ],
        }
    }

    fn entry(id: &str, updated_at: i64) -> EntrySchemaV1 {
        EntrySchemaV1 {
            id: id.to_string(),
            draft: None,
            payload: serde_json::Value::Null,
            word_count: 0,
            raw_text: String::new(),
            bookmark: false,
            review_count: 0,
            created_at: 0,
            updated_at,
            server_version: 0,
            is_deleted: false,
        }
    }

    fn tag(id: &str, updated_at: i64) -> TagSchemaV1 {
        TagSchemaV1 {
            id: id.to_string(),
            name: "t".to_string(),
            group: "g".to_string(),
            created_at: 0,
            updated_at,
            server_version: 0,
            is_deleted: false,
        }
    }

    fn tiptap(id: &str, updated_at: i64) -> TiptapSchemaV1 {
        TiptapSchemaV1 {
            id: id.to_string(),
            content: serde_json::Value::Null,
            history: vec![],
            created_at: 0,
            updated_at,
            server_version: 0,
            is_deleted: false,
        }
    }

    fn new_module() -> SyncModule<MockServer, MockLocal, MockClock> {
        SyncModule::with_clock(MockServer::default(), MockLocal::default(), MockClock::at(0))
    }

    fn transport_err() -> SyncError {
        SyncError::Transport("test error".to_string())
    }

    // ─── RC: reconcile ───────────────────────────────────────────────────────────

    /// RC-01: all declared schema versions supported → reconcile succeeds.
    #[tokio::test]
    async fn rc_01_all_schemas_supported() {
        let m = new_module();
        m.server.enqueue_reconcile(Ok(()));
        assert_eq!(m.reconcile().await, Ok(()));
    }

    /// RC-02: one schema version no longer supported → `SchemaUnsupported` error with details.
    #[tokio::test]
    async fn rc_02_one_schema_unsupported() {
        let m = new_module();
        let unsupported = vec![SchemaDescriptor::new("entry", 1)];
        m.server.enqueue_reconcile(Err(SyncError::SchemaUnsupported {
            schemas: unsupported.clone(),
        }));
        assert_eq!(
            m.reconcile().await,
            Err(SyncError::SchemaUnsupported { schemas: unsupported })
        );
    }

    /// RC-03: multiple schemas unsupported → error reports the full unsupported set.
    #[tokio::test]
    async fn rc_03_multiple_schemas_unsupported() {
        let m = new_module();
        let unsupported = vec![
            SchemaDescriptor::new("entry", 1),
            SchemaDescriptor::new("tag", 1),
        ];
        m.server.enqueue_reconcile(Err(SyncError::SchemaUnsupported {
            schemas: unsupported.clone(),
        }));
        assert_eq!(
            m.reconcile().await,
            Err(SyncError::SchemaUnsupported { schemas: unsupported })
        );
    }

    /// RC-04: server unreachable during reconcile → transport error, not SchemaUnsupported.
    #[tokio::test]
    async fn rc_04_server_unreachable() {
        let m = new_module();
        m.server.enqueue_reconcile(Err(transport_err()));
        let err = m.reconcile().await.unwrap_err();
        assert!(matches!(err, SyncError::Transport(_)));
    }

    // ─── NF: need full sync ───────────────────────────────────────────────────────

    /// NF-01: server_version is 0 → need_full_sync returns true.
    #[tokio::test]
    async fn nf_01_server_version_zero() {
        let m = new_module();
        assert_eq!(m.need_full_sync().await, Ok(true));
    }

    /// NF-02: server_version is non-zero → need_full_sync returns false.
    #[tokio::test]
    async fn nf_02_server_version_nonzero() {
        let local = MockLocal::with_server_version(42);
        let m = SyncModule::with_clock(MockServer::default(), local, MockClock::at(0));
        assert_eq!(m.need_full_sync().await, Ok(false));
    }

    // ─── FS: full sync ────────────────────────────────────────────────────────────

    /// FS-01: server returns data → local cleared, records written, server_version persisted.
    #[tokio::test]
    async fn fs_01_server_returns_data() {
        let m = new_module();
        m.server.enqueue_full_sync(Ok(MockPullData {
            server_version: 99,
            entries: vec![entry("e1", 10)],
            tags: vec![tag("t1", 20)],
            tiptaps: vec![tiptap("tp1", 30)],
        }));

        assert_eq!(m.full_sync().await, Ok(SyncOutcome::Completed));
        assert_eq!(m.local.cleared_count(), 1);
        assert_eq!(m.local.saved_versions(), vec![99]);
        assert_eq!(m.local.upserted_entries(), vec![entry("e1", 10)]);
    }

    /// FS-02: server returns empty dataset → local cleared and server_version still persisted.
    #[tokio::test]
    async fn fs_02_empty_dataset() {
        let m = new_module();
        m.server.enqueue_full_sync(Ok(MockPullData {
            server_version: 5,
            ..MockPullData::default()
        }));

        assert_eq!(m.full_sync().await, Ok(SyncOutcome::Completed));
        assert_eq!(m.local.cleared_count(), 1);
        assert_eq!(m.local.saved_versions(), vec![5]);
    }

    /// FS-03: full_sync called while another sync is in progress → returns AlreadyInProgress.
    #[tokio::test]
    async fn fs_03_already_in_progress() {
        let m = new_module();
        m.simulate_running();
        assert_eq!(m.full_sync().await, Ok(SyncOutcome::AlreadyInProgress));
        assert_eq!(m.local.cleared_count(), 0);
    }

    /// FS-04: server returns is_deleted=true records → apply_pull called with those records
    /// (the port implementation applies LWW + deletion logic internally).
    #[tokio::test]
    async fn fs_04_deleted_records_forwarded_to_port() {
        let m = new_module();
        let mut deleted_entry = entry("e1", 10);
        deleted_entry.is_deleted = true;
        m.server.enqueue_full_sync(Ok(MockPullData {
            server_version: 1,
            entries: vec![deleted_entry.clone()],
            ..MockPullData::default()
        }));

        assert_eq!(m.full_sync().await, Ok(SyncOutcome::Completed));
        // Module forwards records to port unchanged; port owns is_deleted handling.
        assert_eq!(m.local.upserted_entries(), vec![deleted_entry]);
    }

    /// FS-05: storage failure during apply_pull → error propagated.
    #[tokio::test]
    async fn fs_05_network_failure_after_data_fetched() {
        let m = new_module();
        m.server.enqueue_full_sync(Ok(MockPullData {
            server_version: 1,
            entries: vec![entry("e1", 10)],
            ..MockPullData::default()
        }));
        m.local.inject_upsert_entries_error(SyncError::Local("disk full".to_string()));

        let result = m.full_sync().await;
        assert!(result.is_err());
    }

    /// FS-06: server returns server_version lower than current → still persisted as-is.
    #[tokio::test]
    async fn fs_06_lower_server_version_persisted() {
        let local = MockLocal::with_server_version(100);
        let m = SyncModule::with_clock(MockServer::default(), local, MockClock::at(0));
        m.server.enqueue_full_sync(Ok(MockPullData {
            server_version: 1,
            ..MockPullData::default()
        }));

        assert_eq!(m.full_sync().await, Ok(SyncOutcome::Completed));
        assert_eq!(m.local.saved_versions(), vec![1]);
    }

    // ─── PU: push ─────────────────────────────────────────────────────────────────

    /// PU-01: no pending records → no server call made.
    #[tokio::test]
    async fn pu_01_no_pending_records() {
        let m = new_module();
        m.server.enqueue_pull(Ok(MockPullData::default()));
        m.sync().await;
        assert_eq!(m.server.push_call_count(), 0);
    }

    /// PU-02: pending records exist for all schemas → single push containing all schemas.
    #[tokio::test]
    async fn pu_02_all_schemas_have_pending() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.local.set_pending_tags(vec![tag("t1", 20)]);
        m.local.set_pending_tiptaps(vec![tiptap("tp1", 30)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        let calls = m.server.push_calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].entries, vec![entry("e1", 10)]);
        assert_eq!(calls[0].tags, vec![tag("t1", 20)]);
        assert_eq!(calls[0].tiptaps, vec![tiptap("tp1", 30)]);
    }

    /// PU-03: pending records exist for some schemas → payload contains non-empty schemas.
    #[tokio::test]
    async fn pu_03_partial_schemas_have_pending() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        // tags and tiptaps remain empty
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        let calls = m.server.push_calls();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].entries, vec![entry("e1", 10)]);
        assert!(calls[0].tags.is_empty());
        assert!(calls[0].tiptaps.is_empty());
    }

    /// PU-04: server confirms all schemas → all pushed records marked synced.
    #[tokio::test]
    async fn pu_04_all_schemas_confirmed() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 100)]);
        m.local.set_pending_tags(vec![tag("t1", 200)]);
        m.server.enqueue_push(Ok(PushResult {
            processed_schemas: vec![
                SchemaDescriptor::new("entry", 1),
                SchemaDescriptor::new("tag", 1),
            ],
        }));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 100)]);
        assert_eq!(m.local.marked_tags(), vec![("t1".to_string(), 200)]);
        assert!(m.local.marked_tiptaps().is_empty());
    }

    /// PU-05: server skips one schema → only confirmed schemas marked synced.
    #[tokio::test]
    async fn pu_05_server_skips_one_schema() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.local.set_pending_tiptaps(vec![tiptap("tp1", 20)]);
        // Server only confirms Entry; Tiptap is skipped (no longer supported).
        m.server.enqueue_push(Ok(PushResult {
            processed_schemas: vec![SchemaDescriptor::new("entry", 1)],
        }));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 10)]);
        assert!(m.local.marked_tiptaps().is_empty());
    }

    /// PU-06: module passes (id, updated_at) pairs from the collected snapshot, guarding
    /// against records that change between collection and server confirmation.
    #[tokio::test]
    async fn pu_06_mark_synced_uses_collected_updated_at() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 555)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        // The pair reflects the updated_at at collection time, not any later mutation.
        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 555)]);
    }

    /// PU-07: push network failure → no records marked synced, backoff applied.
    #[tokio::test]
    async fn pu_07_push_network_failure() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Err(transport_err()));

        m.sync().await;

        assert!(m.local.marked_entries().is_empty());
        assert!(m.wait_ms() > 3_000);
    }

    /// PU-08: push succeeds → backoff reset to base interval, next pull scheduled immediately.
    #[tokio::test]
    async fn pu_08_push_success_resets_backoff() {
        let m = SyncModule::with_clock(
            MockServer::default(),
            MockLocal::default(),
            MockClock::at(1_000),
        );
        // First, drive the wait_ms up via a failure.
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Err(transport_err()));
        m.sync().await;
        assert!(m.wait_ms() > 3_000);

        // Now push succeeds → backoff resets; pull also returns data so wait_ms stays at base.
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 1,
            entries: vec![entry("e2", 5)],
            ..MockPullData::default()
        }));
        m.sync().await;

        assert_eq!(m.wait_ms(), 3_000);
    }

    // ─── PL: pull ─────────────────────────────────────────────────────────────────

    /// PL-01: server returns new records → applied locally, server_version advanced.
    #[tokio::test]
    async fn pl_01_new_records_applied() {
        let m = new_module();
        m.reset_backoff_for_test();
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 7,
            entries: vec![entry("e1", 10)],
            ..MockPullData::default()
        }));

        m.sync().await;

        assert_eq!(m.local.saved_versions(), vec![7]);
        assert_eq!(m.local.upserted_entries(), vec![entry("e1", 10)]);
    }

    /// PL-02/PL-03: LWW logic is owned by the local port; module forwards all records unchanged.
    #[tokio::test]
    async fn pl_02_03_lww_handled_by_port() {
        let m = new_module();
        m.reset_backoff_for_test();
        let remote_newer = entry("e1", 200);
        let remote_older = entry("e2", 5);
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 10,
            entries: vec![remote_newer.clone(), remote_older.clone()],
            ..MockPullData::default()
        }));

        m.sync().await;

        // Module passes both records to the port; port decides which to keep.
        assert_eq!(m.local.upserted_entries(), vec![remote_newer, remote_older]);
    }

    /// PL-04: is_deleted records are forwarded to the port (port owns physical deletion).
    #[tokio::test]
    async fn pl_04_deleted_records_forwarded_to_port() {
        let m = new_module();
        m.reset_backoff_for_test();
        let mut deleted = entry("e1", 10);
        deleted.is_deleted = true;
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 2,
            entries: vec![deleted.clone()],
            ..MockPullData::default()
        }));

        m.sync().await;

        assert_eq!(m.local.upserted_entries(), vec![deleted]);
    }

    /// PL-05: empty response → server_version not updated, backoff doubles.
    #[tokio::test]
    async fn pl_05_empty_response_triggers_backoff() {
        let m = new_module();
        m.reset_backoff_for_test();
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        assert!(m.local.saved_versions().is_empty());
        assert_eq!(m.wait_ms(), 6_000); // 3000 * 2
    }

    /// PL-06: now < nextPull (within backoff window) → pull skipped, no server call.
    #[tokio::test]
    async fn pl_06_within_backoff_window_skips_pull() {
        // Clock starts at 0; next_pull_ms is initialized to base_interval_ms (3000).
        let m = SyncModule::with_clock(
            MockServer::default(),
            MockLocal::default(),
            MockClock::at(0),
        );
        // No pending records → push is no-op. Pull should also be skipped (now=0 < 3000).
        m.sync().await;

        assert!(m.server.pull_since_calls().is_empty());
    }

    /// PL-07: pull network failure → server_version not advanced, backoff doubles.
    #[tokio::test]
    async fn pl_07_pull_network_failure() {
        let local = MockLocal::with_server_version(5);
        let m = SyncModule::with_clock(MockServer::default(), local, MockClock::at(0));
        m.server.enqueue_pull(Err(transport_err()));
        m.reset_backoff_for_test(); // allow pull to run immediately

        m.sync().await;

        assert!(m.local.saved_versions().is_empty());
        assert!(m.wait_ms() > 3_000);
    }

    /// PL-08: server returns records for a subset of schemas → applied without error.
    #[tokio::test]
    async fn pl_08_partial_schema_response() {
        let m = new_module();
        m.reset_backoff_for_test();
        // Server only returns entries; tags and tiptaps are absent.
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 3,
            entries: vec![entry("e1", 10)],
            ..MockPullData::default()
        }));

        m.sync().await;

        assert_eq!(m.local.saved_versions(), vec![3]);
        assert_eq!(m.local.upserted_entries(), vec![entry("e1", 10)]);
        assert!(m.local.upserted_tags.lock().unwrap().is_empty());
    }

    /// PL-09: record does not exist locally → inserted as synced (handled by port's upsert).
    #[tokio::test]
    async fn pl_09_new_record_inserted() {
        let m = new_module();
        m.reset_backoff_for_test();
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 1,
            entries: vec![entry("new_id", 50)],
            ..MockPullData::default()
        }));

        m.sync().await;

        assert_eq!(m.local.upserted_entries(), vec![entry("new_id", 50)]);
    }

    /// PL-10: after backoff cycles, successful pull resets wait interval to base.
    #[tokio::test]
    async fn pl_10_success_after_backoff_resets_wait() {
        let m = new_module();
        m.reset_backoff_for_test();
        // Drive backoff up via one empty response.
        m.server.enqueue_pull(Ok(MockPullData::default()));
        m.sync().await;
        assert_eq!(m.wait_ms(), 6_000);

        // Advance clock past next_pull_ms, then return real data.
        m.clock.advance(10_000);
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 5,
            entries: vec![entry("e1", 10)],
            ..MockPullData::default()
        }));
        m.sync().await;

        assert_eq!(m.wait_ms(), 3_000);
    }

    // ─── SY: sync (push → pull) ───────────────────────────────────────────────────

    /// SY-01: push and pull both succeed → both applied, server_version advanced.
    #[tokio::test]
    async fn sy_01_push_and_pull_succeed() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 20,
            entries: vec![entry("e2", 30)],
            ..MockPullData::default()
        }));

        m.sync().await;

        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 10)]);
        assert_eq!(m.local.saved_versions(), vec![20]);
    }

    /// SY-02: push succeeds, pull returns empty → push committed, pull triggers backoff.
    #[tokio::test]
    async fn sy_02_push_ok_pull_empty() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData::default()));

        m.sync().await;

        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 10)]);
        assert!(m.local.saved_versions().is_empty());
        assert_eq!(m.wait_ms(), 6_000);
    }

    /// SY-03: push fails → pull not attempted, backoff applied.
    #[tokio::test]
    async fn sy_03_push_fails_pull_not_attempted() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Err(transport_err()));

        m.sync().await;

        assert!(m.server.pull_since_calls().is_empty());
        assert!(m.wait_ms() > 3_000);
    }

    /// SY-04: push succeeds but pull fails → push committed, pull error triggers backoff.
    #[tokio::test]
    async fn sy_04_push_ok_pull_fails() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Err(transport_err()));

        let outcome = m.sync().await;

        assert_eq!(outcome, SyncOutcome::Completed);
        assert_eq!(m.local.marked_entries(), vec![("e1".to_string(), 10)]);
        assert!(m.local.saved_versions().is_empty());
        assert!(m.wait_ms() > 3_000);
    }

    /// SY-05: sync called while another sync is in progress → second call is a no-op.
    #[tokio::test]
    async fn sy_05_already_in_progress() {
        let m = new_module();
        m.simulate_running();
        assert_eq!(m.sync().await, SyncOutcome::AlreadyInProgress);
        assert_eq!(m.server.push_call_count(), 0);
    }

    /// SY-06: repeated failed syncs → wait_ms doubles each time up to 30-second cap.
    #[tokio::test]
    async fn sy_06_repeated_failures_double_backoff() {
        let m = new_module();
        for _ in 0..10 {
            m.local.set_pending_entries(vec![entry("e1", 10)]);
            m.server.enqueue_push(Err(transport_err()));
            m.sync().await;
        }
        assert_eq!(m.wait_ms(), MAX_WAIT_MS);
    }

    /// SY-07: successful sync after backoff → wait_ms resets to base interval.
    #[tokio::test]
    async fn sy_07_success_after_backoff_resets_wait() {
        let m = SyncModule::with_clock(
            MockServer::default(),
            MockLocal::default(),
            MockClock::at(100_000),
        );
        // Build up backoff.
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Err(transport_err()));
        m.sync().await;
        let elevated = m.wait_ms();
        assert!(elevated > 3_000);

        // Successful push + pull → resets.
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Ok(all_processed()));
        m.server.enqueue_pull(Ok(MockPullData {
            server_version: 1,
            entries: vec![entry("e2", 20)],
            ..MockPullData::default()
        }));
        m.sync().await;

        assert_eq!(m.wait_ms(), 3_000);
    }

    // ─── CG: concurrency guard ────────────────────────────────────────────────────

    /// CG-01: full_sync called while sync guard is held → returns AlreadyInProgress.
    #[tokio::test]
    async fn cg_01_full_sync_while_sync_running() {
        let m = new_module();
        m.simulate_running();
        assert_eq!(m.full_sync().await, Ok(SyncOutcome::AlreadyInProgress));
    }

    /// CG-02: sync called while full_sync guard is held → returns AlreadyInProgress.
    #[tokio::test]
    async fn cg_02_sync_while_full_sync_running() {
        let m = new_module();
        m.simulate_running();
        assert_eq!(m.sync().await, SyncOutcome::AlreadyInProgress);
    }

    /// CG-03: sync completes normally → guard released, subsequent sync proceeds.
    #[tokio::test]
    async fn cg_03_guard_released_after_completion() {
        let m = new_module();
        m.server.enqueue_pull(Ok(MockPullData::default()));
        m.sync().await;

        m.server.enqueue_pull(Ok(MockPullData::default()));
        assert_eq!(m.sync().await, SyncOutcome::Completed);
    }

    /// CG-04: sync returns an error → guard still released so subsequent calls are not blocked.
    #[tokio::test]
    async fn cg_04_guard_released_after_error() {
        let m = new_module();
        m.local.set_pending_entries(vec![entry("e1", 10)]);
        m.server.enqueue_push(Err(transport_err()));
        m.sync().await;

        // Guard must be released even after an error.
        m.server.enqueue_pull(Ok(MockPullData::default()));
        assert_eq!(m.sync().await, SyncOutcome::Completed);
    }

    // ─── SV: schema version lifecycle ────────────────────────────────────────────

    /// SV-01: server removes support for a declared schema → reconcile returns SchemaUnsupported.
    #[tokio::test]
    async fn sv_01_unsupported_schema_halts_reconcile() {
        let m = new_module();
        let unsupported = vec![SchemaDescriptor::new("tiptap", 1)];
        m.server.enqueue_reconcile(Err(SyncError::SchemaUnsupported {
            schemas: unsupported.clone(),
        }));

        let err = m.reconcile().await.unwrap_err();
        assert_eq!(err, SyncError::SchemaUnsupported { schemas: unsupported });
    }
}
