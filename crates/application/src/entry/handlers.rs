use only_contracts::{
    BookmarkEntryResponse, CreateEntryRequest, CreateEntryResponse, DailyCount as DailyCountDto,
    DeleteEntryResponse, EntryView, GetCurrentYearResponse, GetEntriesCountResponse,
    GetEntryDatesResponse, GetEntryResponse, GetWordsCountResponse, ListEntriesRequest,
    ListEntriesResponse, MonthEntry, UnbookmarkEntryResponse, UpdateEntryRequest,
    UpdateEntryResponse, YearEntry,
};
use only_domain::{AuditFields, Entry, EntryId, TiptapId};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::entry::error::EntryError;
use crate::entry::ports::{DailyCount, DateParts, EntryFilter, EntryRepository};

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
            existing.review_count,
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

/// Returns the total word count across all non-deleted entries.
pub struct GetWordsCountHandler<R> {
    repository: R,
}

impl<R> GetWordsCountHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> GetWordsCountHandler<R> {
    /// Sums the `word_count` column for all visible entries belonging to the creator.
    pub async fn handle(&self, creator_id: i32) -> Result<GetWordsCountResponse, EntryError> {
        let count = self.repository.count_words(creator_id).await?;
        Ok(GetWordsCountResponse { count })
    }
}

/// Returns the per-day entry count heatmap for the current calendar year.
pub struct GetCurrentYearHandler<R> {
    repository: R,
}

impl<R> GetCurrentYearHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> GetCurrentYearHandler<R> {
    /// Queries current-year activity and pads the result to always include the year-start
    /// and today, matching the Go handler's contract.
    pub async fn handle(&self, creator_id: i32) -> Result<GetCurrentYearResponse, EntryError> {
        let mut counts: Vec<DailyCount> = self.repository.count_current_year(creator_id).await?;

        let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
        let today_str = format!(
            "{:04}-{:02}-{:02}",
            now.year(),
            now.month() as u8,
            now.day()
        );
        let year_start_str = format!("{:04}-01-01", now.year());

        if counts.is_empty() || counts.last().map(|c| c.date.as_str()) != Some(&today_str) {
            counts.push(DailyCount {
                date: today_str,
                count: 0,
            });
        }
        if counts.is_empty() || counts.first().map(|c| c.date.as_str()) != Some(&year_start_str) {
            counts.insert(
                0,
                DailyCount {
                    date: year_start_str,
                    count: 0,
                },
            );
        }

        let total = counts.iter().map(|c| c.count).sum();
        let activity = counts
            .into_iter()
            .map(|c| DailyCountDto {
                date: c.date,
                count: c.count,
            })
            .collect();

        Ok(GetCurrentYearResponse {
            activity,
            count: total,
        })
    }
}

/// Returns the count of entries for the creator, optionally restricted to a specific year.
pub struct GetEntriesCountHandler<R> {
    repository: R,
}

impl<R> GetEntriesCountHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> GetEntriesCountHandler<R> {
    /// Counts all non-deleted entries, scoped to `year` when provided.
    pub async fn handle(
        &self,
        creator_id: i32,
        year: Option<i32>,
    ) -> Result<GetEntriesCountResponse, EntryError> {
        let count = self.repository.count_by_year(creator_id, year).await?;
        Ok(GetEntriesCountResponse { count })
    }
}

/// Returns the hierarchical date structure (year → month → days) for all entries.
pub struct GetEntryDatesHandler<R> {
    repository: R,
}

impl<R> GetEntryDatesHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: EntryRepository> GetEntryDatesHandler<R> {
    /// Loads all distinct entry dates and groups them into a year → month → days hierarchy.
    pub async fn handle(&self, creator_id: i32) -> Result<GetEntryDatesResponse, EntryError> {
        let dates: Vec<DateParts> = self.repository.list_dates(creator_id).await?;
        let total = dates.len() as i32;
        let entry_dates = group_dates(dates);
        Ok(GetEntryDatesResponse { total, entry_dates })
    }
}

/// Groups a flat list of `DateParts` (ordered year DESC, month DESC, day DESC) into
/// the nested `YearEntry → MonthEntry → days` contract structure.
fn group_dates(dates: Vec<DateParts>) -> Vec<YearEntry> {
    let mut result: Vec<YearEntry> = Vec::new();

    for part in dates {
        if result.last().map(|y: &YearEntry| y.year) != Some(part.year) {
            result.push(YearEntry {
                year: part.year,
                months: Vec::new(),
            });
        }

        let year_idx = result.len() - 1;
        if result[year_idx].months.last().map(|m: &MonthEntry| m.month) != Some(part.month) {
            result[year_idx].months.push(MonthEntry {
                month: part.month,
                days: Vec::new(),
            });
        }

        let month_idx = result[year_idx].months.len() - 1;
        result[year_idx].months[month_idx].days.push(part.day);
    }

    result
}
