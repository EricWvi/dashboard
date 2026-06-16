use only_application::{
    BookmarkEntryHandler, CreateEntryHandler, DeleteEntryHandler, EntryError,
    GetCurrentYearHandler, GetEntriesCountHandler, GetEntryDatesHandler, GetEntryHandler,
    GetWordsCountHandler, ListEntriesHandler, UnbookmarkEntryHandler, UpdateEntryHandler,
};
use only_contracts::{
    BookmarkEntryResponse, CreateEntryRequest, CreateEntryResponse, DeleteEntryResponse,
    GetCurrentYearResponse, GetEntriesCountResponse, GetEntryDatesResponse, GetEntryResponse,
    GetWordsCountResponse, ListEntriesRequest, ListEntriesResponse, UnbookmarkEntryResponse,
    UpdateEntryRequest, UpdateEntryResponse,
};
use only_db_server::PostgresEntryRepository;
use only_domain::UserId;
use sqlx::{Pool, Postgres};

/// Groups the transport-facing entry entry points for the web adapter.
pub struct EntryApi {
    create: CreateEntryHandler<PostgresEntryRepository>,
    get: GetEntryHandler<PostgresEntryRepository>,
    list: ListEntriesHandler<PostgresEntryRepository>,
    update: UpdateEntryHandler<PostgresEntryRepository>,
    delete: DeleteEntryHandler<PostgresEntryRepository>,
    bookmark: BookmarkEntryHandler<PostgresEntryRepository>,
    unbookmark: UnbookmarkEntryHandler<PostgresEntryRepository>,
    get_words_count: GetWordsCountHandler<PostgresEntryRepository>,
    get_current_year: GetCurrentYearHandler<PostgresEntryRepository>,
    get_entries_count: GetEntriesCountHandler<PostgresEntryRepository>,
    get_entry_dates: GetEntryDatesHandler<PostgresEntryRepository>,
}

impl EntryApi {
    /// Builds the entry API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create: CreateEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            get: GetEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            list: ListEntriesHandler::new(PostgresEntryRepository::new(pool.clone())),
            update: UpdateEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            delete: DeleteEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            bookmark: BookmarkEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            unbookmark: UnbookmarkEntryHandler::new(PostgresEntryRepository::new(pool.clone())),
            get_words_count: GetWordsCountHandler::new(PostgresEntryRepository::new(pool.clone())),
            get_current_year: GetCurrentYearHandler::new(PostgresEntryRepository::new(
                pool.clone(),
            )),
            get_entries_count: GetEntriesCountHandler::new(PostgresEntryRepository::new(
                pool.clone(),
            )),
            get_entry_dates: GetEntryDatesHandler::new(PostgresEntryRepository::new(pool)),
        }
    }

    /// Delegates an entry creation request to the application handler.
    pub async fn create(
        &self,
        request: CreateEntryRequest,
        creator_id: UserId,
    ) -> Result<CreateEntryResponse, EntryError> {
        self.create.handle(request, creator_id).await
    }

    /// Delegates a get-entry request to the application handler.
    pub async fn get(&self, id: &str, creator_id: UserId) -> Result<GetEntryResponse, EntryError> {
        self.get.handle(id, creator_id).await
    }

    /// Delegates a list-entries request to the application handler.
    pub async fn list(
        &self,
        request: ListEntriesRequest,
        creator_id: UserId,
    ) -> Result<ListEntriesResponse, EntryError> {
        self.list.handle(request, creator_id).await
    }

    /// Delegates an update-entry request to the application handler.
    pub async fn update(
        &self,
        id: &str,
        request: UpdateEntryRequest,
        creator_id: UserId,
    ) -> Result<UpdateEntryResponse, EntryError> {
        self.update.handle(id, request, creator_id).await
    }

    /// Delegates a delete-entry request to the application handler.
    pub async fn delete(
        &self,
        id: &str,
        creator_id: UserId,
    ) -> Result<DeleteEntryResponse, EntryError> {
        self.delete.handle(id, creator_id).await
    }

    /// Delegates a bookmark-entry request to the application handler.
    pub async fn bookmark(
        &self,
        id: &str,
        creator_id: UserId,
    ) -> Result<BookmarkEntryResponse, EntryError> {
        self.bookmark.handle(id, creator_id).await
    }

    /// Delegates an unbookmark-entry request to the application handler.
    pub async fn unbookmark(
        &self,
        id: &str,
        creator_id: UserId,
    ) -> Result<UnbookmarkEntryResponse, EntryError> {
        self.unbookmark.handle(id, creator_id).await
    }

    /// Returns the total word count for all non-deleted entries owned by the creator.
    pub async fn get_words_count(
        &self,
        creator_id: UserId,
    ) -> Result<GetWordsCountResponse, EntryError> {
        self.get_words_count.handle(creator_id).await
    }

    /// Returns the current-year activity heatmap for the creator.
    pub async fn get_current_year(
        &self,
        creator_id: UserId,
    ) -> Result<GetCurrentYearResponse, EntryError> {
        self.get_current_year.handle(creator_id).await
    }

    /// Returns the count of entries, optionally filtered to a specific year.
    pub async fn get_entries_count(
        &self,
        creator_id: UserId,
        year: Option<i32>,
    ) -> Result<GetEntriesCountResponse, EntryError> {
        self.get_entries_count.handle(creator_id, year).await
    }

    /// Returns the hierarchical date structure for all non-deleted entries.
    pub async fn get_entry_dates(
        &self,
        creator_id: UserId,
    ) -> Result<GetEntryDatesResponse, EntryError> {
        self.get_entry_dates.handle(creator_id).await
    }
}
