use only_contracts::{
    BookmarkEntryResponse, CreateEntryRequest, CreateEntryResponse, DeleteEntryResponse, EntryView,
    GetEntryResponse, ListEntriesRequest, ListEntriesResponse, UnbookmarkEntryResponse,
    UpdateEntryRequest, UpdateEntryResponse,
};
use only_domain::{AuditFields, Entry, EntryId, TiptapId};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entry::error::EntryError;
use crate::entry::ports::{EntryFilter, EntryRepository};

/// Returns the current Unix timestamp in milliseconds, preferring local time.
fn now_millis() -> i64 {
    OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Maps a domain entry to its public contract view.
fn map_entry(e: Entry) -> EntryView {
    EntryView {
        id: e.id.to_string(),
        draft: e.draft.map(|d| d.to_string()),
        payload: e.payload,
        word_count: e.word_count,
        raw_text: e.raw_text,
        bookmark: e.bookmark,
        review_count: e.review_count,
        created_at: e.audit_fields.created_at,
        updated_at: e.audit_fields.updated_at,
    }
}

/// Handles entry creation without depending on transport-specific concerns.
pub struct CreateEntryHandler<R> {
    repository: R,
}

impl<R> CreateEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> CreateEntryHandler<R> {
    /// Creates a new entry record and returns the public response payload.
    pub async fn handle(
        &self,
        request: CreateEntryRequest,
        creator_id: i32,
    ) -> Result<CreateEntryResponse, EntryError> {
        let now = now_millis();
        let id = EntryId::new(Uuid::new_v4().to_string());
        let draft = request.draft.map(TiptapId::new);
        let entry = Entry::new(
            id,
            creator_id,
            draft,
            request.payload,
            request.word_count,
            request.raw_text,
            false,
            0,
            AuditFields::new(now, now, 0, false),
        );
        let entry = self.repository.create(entry).await?;
        Ok(CreateEntryResponse {
            entry: map_entry(entry),
        })
    }
}

/// Handles fetching a single entry without depending on transport-specific concerns.
pub struct GetEntryHandler<R> {
    repository: R,
}

impl<R> GetEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> GetEntryHandler<R> {
    /// Loads one visible entry or returns a stable not-found error.
    pub async fn handle(&self, id: &str, creator_id: i32) -> Result<GetEntryResponse, EntryError> {
        let entry_id = EntryId::new(id);
        let entry = self
            .repository
            .find_by_id_and_creator(&entry_id, creator_id)
            .await?;
        match entry {
            Some(e) => Ok(GetEntryResponse {
                entry: map_entry(e),
            }),
            None => Err(EntryError::NotFound { id: id.to_string() }),
        }
    }
}

/// Handles paginated entry listing with optional filters.
pub struct ListEntriesHandler<R> {
    repository: R,
}

impl<R> ListEntriesHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> ListEntriesHandler<R> {
    /// Lists entries matching the request filters. Delegates to random listing when requested.
    pub async fn handle(
        &self,
        request: ListEntriesRequest,
        creator_id: i32,
    ) -> Result<ListEntriesResponse, EntryError> {
        if request.random.unwrap_or(false) {
            let entries = self.repository.list_random(creator_id).await?;
            return Ok(ListEntriesResponse {
                entries: entries.into_iter().map(map_entry).collect(),
                has_more: false,
            });
        }

        let filter = EntryFilter {
            tag: request.tag,
            contains: request.contains,
            bookmarked: request.bookmarked,
            on: request.on,
            before: request.before,
            today: request.today.unwrap_or(false),
        };
        let page = request.page.max(1);
        let (entries, has_more) = self.repository.list(creator_id, &filter, page).await?;
        Ok(ListEntriesResponse {
            entries: entries.into_iter().map(map_entry).collect(),
            has_more,
        })
    }
}

/// Handles entry updates without depending on transport-specific concerns.
pub struct UpdateEntryHandler<R> {
    repository: R,
}

impl<R> UpdateEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> UpdateEntryHandler<R> {
    /// Replaces the mutable fields of an entry and returns the updated view.
    pub async fn handle(
        &self,
        id: &str,
        request: UpdateEntryRequest,
        creator_id: i32,
    ) -> Result<UpdateEntryResponse, EntryError> {
        let now = now_millis();
        let entry_id = EntryId::new(id);
        let draft = request.draft.map(TiptapId::new);
        // Use the existing audit_fields.created_at by reading first; updated_at is refreshed.
        let existing = self
            .repository
            .find_by_id_and_creator(&entry_id, creator_id)
            .await?
            .ok_or_else(|| EntryError::NotFound { id: id.to_string() })?;

        let updated = Entry::new(
            entry_id,
            creator_id,
            draft,
            request.payload,
            request.word_count,
            request.raw_text,
            request.bookmark,
            request.review_count,
            AuditFields::new(
                existing.audit_fields.created_at,
                now,
                existing.audit_fields.server_version,
                false,
            ),
        );
        let saved = self
            .repository
            .update(updated)
            .await?
            .ok_or_else(|| EntryError::NotFound { id: id.to_string() })?;
        Ok(UpdateEntryResponse {
            entry: map_entry(saved),
        })
    }
}

/// Handles entry soft-deletion without depending on transport-specific concerns.
pub struct DeleteEntryHandler<R> {
    repository: R,
}

impl<R> DeleteEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> DeleteEntryHandler<R> {
    /// Soft-deletes the entry and returns the deleted id.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteEntryResponse, EntryError> {
        let entry_id = EntryId::new(id);
        let now = now_millis();
        let deleted = self
            .repository
            .soft_delete(&entry_id, creator_id, now)
            .await?;
        if !deleted {
            return Err(EntryError::NotFound { id: id.to_string() });
        }
        Ok(DeleteEntryResponse { id: id.to_string() })
    }
}

/// Handles setting the bookmark flag on an entry.
pub struct BookmarkEntryHandler<R> {
    repository: R,
}

impl<R> BookmarkEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> BookmarkEntryHandler<R> {
    /// Sets `bookmark = true` on the identified entry.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<BookmarkEntryResponse, EntryError> {
        let entry_id = EntryId::new(id);
        let now = now_millis();
        let affected = self
            .repository
            .set_bookmark(&entry_id, creator_id, /*bookmark=*/ true, now)
            .await?;
        if !affected {
            return Err(EntryError::NotFound { id: id.to_string() });
        }
        Ok(BookmarkEntryResponse {})
    }
}

/// Handles clearing the bookmark flag on an entry.
pub struct UnbookmarkEntryHandler<R> {
    repository: R,
}

impl<R> UnbookmarkEntryHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> UnbookmarkEntryHandler<R> {
    /// Sets `bookmark = false` on the identified entry.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<UnbookmarkEntryResponse, EntryError> {
        let entry_id = EntryId::new(id);
        let now = now_millis();
        let affected = self
            .repository
            .set_bookmark(&entry_id, creator_id, /*bookmark=*/ false, now)
            .await?;
        if !affected {
            return Err(EntryError::NotFound { id: id.to_string() });
        }
        Ok(UnbookmarkEntryResponse {})
    }
}
