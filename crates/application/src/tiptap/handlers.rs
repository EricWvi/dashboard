use only_contracts::{
    BottomQuickNoteResponse, CreateQuickNoteRequest, CreateQuickNoteResponse, CreateTiptapRequest,
    CreateTiptapResponse, DeleteQuickNoteResponse, GetTiptapResponse, HistoryEntryView,
    ListQuickNotesResponse, ListTiptapHistoryResponse, QuickNoteView, RestoreTiptapHistoryRequest,
    RestoreTiptapHistoryResponse, TiptapView, UpdateQuickNoteRequest, UpdateQuickNoteResponse,
    UpdateTiptapRequest, UpdateTiptapResponse,
};
use only_domain::{AuditFields, HistoryEntry, QuickNote, QuickNoteId, TiptapId, TiptapV2};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::tiptap::error::TiptapError;
use crate::tiptap::ports::{QuickNoteRepository, TiptapRepository};

/// Returns the current Unix timestamp in milliseconds, preferring local time.
fn now_millis() -> i64 {
    OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Maps a domain TiptapV2 to its public contract view.
fn map_tiptap(t: TiptapV2) -> TiptapView {
    TiptapView {
        id: t.id.to_string(),
        site: t.site,
        content: t.content,
        history: t.history.into_iter().map(map_history_entry).collect(),
        created_at: t.audit_fields.created_at,
        updated_at: t.audit_fields.updated_at,
    }
}

fn map_history_entry(h: HistoryEntry) -> HistoryEntryView {
    HistoryEntryView {
        time: h.time,
        content: h.content,
    }
}

/// Maps a domain QuickNote to its public contract view.
fn map_quick_note(n: QuickNote) -> QuickNoteView {
    QuickNoteView {
        id: n.id.to_string(),
        title: n.title,
        draft: n.draft.map(|d| d.to_string()),
        order: n.order,
        created_at: n.audit_fields.created_at,
        updated_at: n.audit_fields.updated_at,
    }
}

// ── Tiptap handlers ───────────────────────────────────────────────────────────

/// Handles Tiptap document creation without depending on transport-specific concerns.
pub struct CreateTiptapHandler<R> {
    repository: R,
}

impl<R> CreateTiptapHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TiptapRepository> CreateTiptapHandler<R> {
    /// Creates a new Tiptap document and returns the public response payload.
    pub async fn handle(
        &self,
        request: CreateTiptapRequest,
        creator_id: i32,
    ) -> Result<CreateTiptapResponse, TiptapError> {
        let now = now_millis();
        let id = TiptapId::new(Uuid::new_v4().to_string());
        let tiptap = TiptapV2::new(
            id,
            creator_id,
            request.site,
            request.content,
            vec![],
            AuditFields::new(now, now, 0, false),
        );
        let saved = self.repository.create(tiptap).await?;
        Ok(CreateTiptapResponse {
            tiptap: map_tiptap(saved),
        })
    }
}

/// Handles fetching a single Tiptap document.
pub struct GetTiptapHandler<R> {
    repository: R,
}

impl<R> GetTiptapHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TiptapRepository> GetTiptapHandler<R> {
    /// Loads one visible Tiptap document or returns a not-found error.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetTiptapResponse, TiptapError> {
        let tiptap_id = TiptapId::new(id);
        let tiptap = self
            .repository
            .find_by_id_and_creator(&tiptap_id, creator_id)
            .await?;
        match tiptap {
            Some(t) => Ok(GetTiptapResponse {
                tiptap: map_tiptap(t),
            }),
            None => Err(TiptapError::NotFound { id: id.to_string() }),
        }
    }
}

/// Handles Tiptap document content updates.
///
/// The repository atomically backs up the existing content into `history` before
/// replacing it with the new content.
pub struct UpdateTiptapHandler<R> {
    repository: R,
}

impl<R> UpdateTiptapHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TiptapRepository> UpdateTiptapHandler<R> {
    /// Replaces the document content and pushes the old content into history.
    pub async fn handle(
        &self,
        id: &str,
        request: UpdateTiptapRequest,
        creator_id: i32,
    ) -> Result<UpdateTiptapResponse, TiptapError> {
        let tiptap_id = TiptapId::new(id);
        let saved = self
            .repository
            .update_content(&tiptap_id, creator_id, request.content, request.ts)
            .await?;
        if saved.is_none() {
            return Err(TiptapError::NotFound { id: id.to_string() });
        }
        Ok(UpdateTiptapResponse {})
    }
}

/// Handles listing the history timestamps for a Tiptap document.
pub struct ListTiptapHistoryHandler<R> {
    repository: R,
}

impl<R> ListTiptapHistoryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TiptapRepository> ListTiptapHistoryHandler<R> {
    /// Returns the sorted list of history timestamps for the document.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<ListTiptapHistoryResponse, TiptapError> {
        let tiptap_id = TiptapId::new(id);
        let tiptap = self
            .repository
            .find_by_id_and_creator(&tiptap_id, creator_id)
            .await?
            .ok_or_else(|| TiptapError::NotFound { id: id.to_string() })?;

        let mut timestamps: Vec<i64> = tiptap.history.iter().map(|h| h.time).collect();
        timestamps.sort_unstable_by(|a, b| b.cmp(a)); // descending

        Ok(ListTiptapHistoryResponse {
            history: timestamps,
        })
    }
}

/// Handles restoring a Tiptap document to a previously saved history snapshot.
pub struct RestoreTiptapHistoryHandler<R> {
    repository: R,
}

impl<R> RestoreTiptapHistoryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TiptapRepository> RestoreTiptapHistoryHandler<R> {
    /// Restores the document to the history entry matching `ts`.
    pub async fn handle(
        &self,
        id: &str,
        request: RestoreTiptapHistoryRequest,
        creator_id: i32,
    ) -> Result<RestoreTiptapHistoryResponse, TiptapError> {
        let tiptap_id = TiptapId::new(id);
        let tiptap = self
            .repository
            .find_by_id_and_creator(&tiptap_id, creator_id)
            .await?
            .ok_or_else(|| TiptapError::NotFound { id: id.to_string() })?;

        let restored_content: Value = tiptap
            .history
            .into_iter()
            .find(|h| h.time == request.ts)
            .map(|h| h.content)
            .ok_or(TiptapError::HistoryNotFound { ts: request.ts })?;

        let now = now_millis();
        self.repository
            .update_content(&tiptap_id, creator_id, restored_content, now)
            .await?;

        Ok(RestoreTiptapHistoryResponse {})
    }
}

// ── Quick Note handlers ───────────────────────────────────────────────────────

/// Handles quick note creation, assigning the next highest display order.
pub struct CreateQuickNoteHandler<R> {
    repository: R,
}

impl<R> CreateQuickNoteHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: QuickNoteRepository> CreateQuickNoteHandler<R> {
    /// Creates a quick note with order = max(current_max + 1, 1).
    pub async fn handle(
        &self,
        request: CreateQuickNoteRequest,
        creator_id: i32,
    ) -> Result<CreateQuickNoteResponse, TiptapError> {
        let now = now_millis();
        let max_order = self.repository.max_order(creator_id).await?;
        let order = (max_order + 1).max(1);

        let id = only_domain::QuickNoteId::new(Uuid::new_v4().to_string());
        let draft = request.draft.map(TiptapId::new);
        let note = QuickNote::new(
            id,
            creator_id,
            request.title,
            draft,
            Some(order),
            AuditFields::new(now, now, 0, false),
        );
        let saved = self.repository.create(note).await?;
        Ok(CreateQuickNoteResponse {
            quick_note: map_quick_note(saved),
        })
    }
}

/// Handles listing all quick notes for the authenticated user.
pub struct ListQuickNotesHandler<R> {
    repository: R,
}

impl<R> ListQuickNotesHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: QuickNoteRepository> ListQuickNotesHandler<R> {
    /// Lists quick notes ordered by display order descending.
    pub async fn handle(&self, creator_id: i32) -> Result<ListQuickNotesResponse, TiptapError> {
        let notes = self.repository.list_by_creator(creator_id).await?;
        Ok(ListQuickNotesResponse {
            quick_notes: notes.into_iter().map(map_quick_note).collect(),
        })
    }
}

/// Handles quick note updates.
pub struct UpdateQuickNoteHandler<R> {
    repository: R,
}

impl<R> UpdateQuickNoteHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: QuickNoteRepository> UpdateQuickNoteHandler<R> {
    /// Replaces the mutable fields of a quick note.
    pub async fn handle(
        &self,
        id: &str,
        request: UpdateQuickNoteRequest,
        creator_id: i32,
    ) -> Result<UpdateQuickNoteResponse, TiptapError> {
        let now = now_millis();
        let note_id = QuickNoteId::new(id);
        let draft = request.draft.map(TiptapId::new);
        let note = QuickNote::new(
            note_id,
            creator_id,
            request.title,
            draft,
            request.order,
            AuditFields::new(now, now, 0, false),
        );
        let saved = self.repository.update(note).await?;
        if saved.is_none() {
            return Err(TiptapError::QuickNoteNotFound { id: id.to_string() });
        }
        Ok(UpdateQuickNoteResponse {})
    }
}

/// Handles quick note soft-deletion.
pub struct DeleteQuickNoteHandler<R> {
    repository: R,
}

impl<R> DeleteQuickNoteHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: QuickNoteRepository> DeleteQuickNoteHandler<R> {
    /// Soft-deletes the quick note and returns the deleted id.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteQuickNoteResponse, TiptapError> {
        let note_id = QuickNoteId::new(id);
        let now = now_millis();
        let deleted = self
            .repository
            .soft_delete(&note_id, creator_id, now)
            .await?;
        if !deleted {
            return Err(TiptapError::QuickNoteNotFound { id: id.to_string() });
        }
        Ok(DeleteQuickNoteResponse { id: id.to_string() })
    }
}

/// Moves a quick note to the bottom of the display order.
pub struct BottomQuickNoteHandler<R> {
    repository: R,
}

impl<R> BottomQuickNoteHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: QuickNoteRepository> BottomQuickNoteHandler<R> {
    /// Sets the note's order to min(current_min - 1, -1).
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<BottomQuickNoteResponse, TiptapError> {
        let note_id = QuickNoteId::new(id);
        let now = now_millis();
        let min_order = self.repository.min_order(creator_id).await?;
        let order = (min_order - 1).min(-1);
        let affected = self
            .repository
            .set_order(&note_id, creator_id, order, now)
            .await?;
        if !affected {
            return Err(TiptapError::QuickNoteNotFound { id: id.to_string() });
        }
        Ok(BottomQuickNoteResponse {})
    }
}
