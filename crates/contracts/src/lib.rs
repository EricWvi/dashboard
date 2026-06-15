mod auth;
mod bookmark;
mod collection;
mod entry;
mod frontend;
mod media;
mod tag;
mod tiptap;
mod user;

pub use auth::{AuthQuery, AuthResponse};
pub use bookmark::{
    BookmarkPath, BookmarkView, ClickBookmarkRequest, ClickBookmarkResponse, CreateBookmarkRequest,
    CreateBookmarkResponse, DeleteBookmarkRequest, DeleteBookmarkResponse, GetBookmarkRequest,
    GetBookmarkResponse, ListBookmarksRequest, ListBookmarksResponse, UpdateBookmarkRequest,
    UpdateBookmarkResponse,
};
pub use collection::{
    CollectionPath, CollectionView, CreateCollectionRequest, CreateCollectionResponse,
    DeleteCollectionRequest, DeleteCollectionResponse, GetCollectionRequest, GetCollectionResponse,
    ListAllTodosRequest, ListAllTodosResponse, ListCollectionsRequest, ListCollectionsResponse,
    ListTodayTodosRequest, ListTodayTodosResponse, PlanTodayRequest, PlanTodayResponse, TodoView,
    UpdateCollectionRequest, UpdateCollectionResponse,
};
pub use entry::{
    BookmarkEntryRequest, BookmarkEntryResponse, CreateEntryRequest, CreateEntryResponse,
    DailyCount, DeleteEntryRequest, DeleteEntryResponse, EntryPath, EntryView,
    GetCurrentYearResponse, GetEntriesCountRequest, GetEntriesCountResponse, GetEntryDatesResponse,
    GetEntryRequest, GetEntryResponse, GetWordsCountResponse, ListEntriesRequest,
    ListEntriesResponse, MonthEntry, UnbookmarkEntryRequest, UnbookmarkEntryResponse,
    UpdateEntryRequest, UpdateEntryResponse, YearEntry,
};
pub use frontend::{
    BOOKMARK_CLICK_PATH, BOOKMARK_PATH, BOOKMARKS_PATH, COLLECTION_PATH, COLLECTIONS_PATH,
    ENTRIES_PATH, ENTRY_BOOKMARK_PATH, ENTRY_PATH, ENTRY_UNBOOKMARK_PATH, FrontendEndpoint,
    FrontendHttpMethod, FrontendPathParam, MEDIA_PATH, QUICKNOTE_BOTTOM_PATH, QUICKNOTE_PATH,
    QUICKNOTES_PATH, TAGS_PATH, TIPTAP_HISTORY_PATH, TIPTAP_HISTORY_RESTORE_PATH, TIPTAP_PATH,
    TIPTAPS_PATH, TODOS_ALL_PATH, TODOS_PLAN_TODAY_PATH, TODOS_TODAY_PATH, frontend_endpoints,
};
pub use media::{DeleteMediaRequest, DeleteMediaResponse, UploadResponse};
use serde_json::Value;
pub use tag::{
    CreateTagsRequest, CreateTagsResponse, DeleteTagRequest, DeleteTagResponse, ListTagsRequest,
    ListTagsResponse, LocalTagView, TagView,
};
pub use tiptap::{
    BottomQuickNoteRequest, BottomQuickNoteResponse, CreateQuickNoteRequest,
    CreateQuickNoteResponse, CreateTiptapRequest, CreateTiptapResponse, DeleteQuickNoteRequest,
    DeleteQuickNoteResponse, GetTiptapRequest, GetTiptapResponse, HistoryEntryView,
    ListQuickNotesRequest, ListQuickNotesResponse, ListTiptapHistoryRequest,
    ListTiptapHistoryResponse, LocalTiptapView, QuickNotePath, QuickNoteView,
    RestoreTiptapHistoryRequest, RestoreTiptapHistoryResponse, TiptapPath, TiptapView,
    UpdateQuickNoteRequest, UpdateQuickNoteResponse, UpdateTiptapRequest, UpdateTiptapResponse,
};
pub use user::{GetUserRequest, GetUserResponse, UpdateUserRequest, UpdateUserResponse, UserView};

use std::path::Path;
use ts_rs::{Config, ExportError, TS};

/// Exports every contract DTO family into the shared TypeScript package for frontend consumers.
pub fn export_typescript_bindings_to(
    output_directory: impl AsRef<Path>,
) -> Result<(), ExportError> {
    let config = Config::new().with_out_dir(output_directory.as_ref());

    <Value as TS>::export(&config)?;

    AuthQuery::export(&config)?;
    AuthResponse::export(&config)?;

    CollectionView::export(&config)?;
    TodoView::export(&config)?;
    ListCollectionsRequest::export(&config)?;
    ListCollectionsResponse::export(&config)?;
    CreateCollectionRequest::export(&config)?;
    CreateCollectionResponse::export(&config)?;
    GetCollectionRequest::export(&config)?;
    GetCollectionResponse::export(&config)?;
    UpdateCollectionRequest::export(&config)?;
    UpdateCollectionResponse::export(&config)?;
    DeleteCollectionRequest::export(&config)?;
    DeleteCollectionResponse::export(&config)?;
    ListAllTodosRequest::export(&config)?;
    ListAllTodosResponse::export(&config)?;
    ListTodayTodosRequest::export(&config)?;
    ListTodayTodosResponse::export(&config)?;
    PlanTodayRequest::export(&config)?;
    PlanTodayResponse::export(&config)?;

    EntryView::export(&config)?;
    ListEntriesRequest::export(&config)?;
    ListEntriesResponse::export(&config)?;
    CreateEntryRequest::export(&config)?;
    CreateEntryResponse::export(&config)?;
    GetEntryRequest::export(&config)?;
    GetEntryResponse::export(&config)?;
    UpdateEntryRequest::export(&config)?;
    UpdateEntryResponse::export(&config)?;
    DeleteEntryRequest::export(&config)?;
    DeleteEntryResponse::export(&config)?;
    BookmarkEntryRequest::export(&config)?;
    BookmarkEntryResponse::export(&config)?;
    UnbookmarkEntryRequest::export(&config)?;
    UnbookmarkEntryResponse::export(&config)?;
    DailyCount::export(&config)?;
    GetCurrentYearResponse::export(&config)?;
    GetEntriesCountRequest::export(&config)?;
    GetEntriesCountResponse::export(&config)?;
    MonthEntry::export(&config)?;
    YearEntry::export(&config)?;
    GetEntryDatesResponse::export(&config)?;
    GetWordsCountResponse::export(&config)?;

    TagView::export(&config)?;
    CreateTagsRequest::export(&config)?;
    CreateTagsResponse::export(&config)?;
    ListTagsRequest::export(&config)?;
    ListTagsResponse::export(&config)?;
    DeleteTagRequest::export(&config)?;
    DeleteTagResponse::export(&config)?;

    TiptapView::export(&config)?;
    HistoryEntryView::export(&config)?;
    CreateTiptapRequest::export(&config)?;
    CreateTiptapResponse::export(&config)?;
    GetTiptapRequest::export(&config)?;
    GetTiptapResponse::export(&config)?;
    UpdateTiptapRequest::export(&config)?;
    UpdateTiptapResponse::export(&config)?;
    ListTiptapHistoryRequest::export(&config)?;
    ListTiptapHistoryResponse::export(&config)?;
    RestoreTiptapHistoryRequest::export(&config)?;
    RestoreTiptapHistoryResponse::export(&config)?;
    QuickNoteView::export(&config)?;
    CreateQuickNoteRequest::export(&config)?;
    CreateQuickNoteResponse::export(&config)?;
    ListQuickNotesRequest::export(&config)?;
    ListQuickNotesResponse::export(&config)?;
    UpdateQuickNoteRequest::export(&config)?;
    UpdateQuickNoteResponse::export(&config)?;
    DeleteQuickNoteRequest::export(&config)?;
    DeleteQuickNoteResponse::export(&config)?;
    BottomQuickNoteRequest::export(&config)?;
    BottomQuickNoteResponse::export(&config)?;

    BookmarkView::export(&config)?;
    CreateBookmarkRequest::export(&config)?;
    CreateBookmarkResponse::export(&config)?;
    GetBookmarkRequest::export(&config)?;
    GetBookmarkResponse::export(&config)?;
    ListBookmarksRequest::export(&config)?;
    ListBookmarksResponse::export(&config)?;
    UpdateBookmarkRequest::export(&config)?;
    UpdateBookmarkResponse::export(&config)?;
    DeleteBookmarkRequest::export(&config)?;
    DeleteBookmarkResponse::export(&config)?;
    ClickBookmarkRequest::export(&config)?;
    ClickBookmarkResponse::export(&config)?;

    UploadResponse::export(&config)?;
    DeleteMediaRequest::export(&config)?;
    DeleteMediaResponse::export(&config)?;

    UserView::export(&config)?;
    GetUserRequest::export(&config)?;
    GetUserResponse::export(&config)?;
    UpdateUserRequest::export(&config)?;
    UpdateUserResponse::export(&config)?;

    Ok(())
}
