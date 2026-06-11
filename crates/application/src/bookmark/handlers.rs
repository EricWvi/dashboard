use only_contracts::{
    BookmarkView, ClickBookmarkResponse, CreateBookmarkRequest, CreateBookmarkResponse,
    DeleteBookmarkResponse, GetBookmarkResponse, ListBookmarksResponse, UpdateBookmarkRequest,
    UpdateBookmarkResponse,
};
use only_domain::{AuditFields, Bookmark, BookmarkId};
use only_logging::clock;
use uuid::Uuid;

use crate::bookmark::error::BookmarkError;
use crate::bookmark::ports::BookmarkRepository;

/// Returns the current Unix timestamp in milliseconds, preferring local time.
fn now_millis() -> i64 {
    clock::now_millis()
}

/// Maps a domain bookmark to its public contract view.
fn map_bookmark(b: Bookmark) -> BookmarkView {
    BookmarkView {
        id: b.id.to_string(),
        url: b.url,
        title: b.title,
        click: b.click,
        domain: b.domain,
        payload: b.payload,
        created_at: b.audit_fields.created_at,
        updated_at: b.audit_fields.updated_at,
    }
}

/// Handles bookmark creation without depending on transport-specific concerns.
pub struct CreateBookmarkHandler<R> {
    repository: R,
}

impl<R> CreateBookmarkHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> CreateBookmarkHandler<R> {
    /// Creates a new bookmark and returns the public response payload.
    pub async fn handle(
        &self,
        request: CreateBookmarkRequest,
        creator_id: i32,
    ) -> Result<CreateBookmarkResponse, BookmarkError> {
        let now = now_millis();
        let id = BookmarkId::new(Uuid::new_v4().to_string());
        let bookmark = Bookmark::new(
            id,
            creator_id,
            request.url,
            request.title,
            0,
            request.domain,
            request.payload,
            AuditFields::new(now, now, 0, false),
        );
        let saved = self.repository.create(bookmark).await?;
        Ok(CreateBookmarkResponse {
            bookmark: map_bookmark(saved),
        })
    }
}

/// Handles fetching a single bookmark.
pub struct GetBookmarkHandler<R> {
    repository: R,
}

impl<R> GetBookmarkHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> GetBookmarkHandler<R> {
    /// Loads one visible bookmark or returns a not-found error.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetBookmarkResponse, BookmarkError> {
        let bookmark_id = BookmarkId::new(id);
        let bookmark = self
            .repository
            .find_by_id_and_creator(&bookmark_id, creator_id)
            .await?;
        match bookmark {
            Some(b) => Ok(GetBookmarkResponse {
                bookmark: map_bookmark(b),
            }),
            None => Err(BookmarkError::NotFound { id: id.to_string() }),
        }
    }
}

/// Handles listing all bookmarks for the authenticated user.
pub struct ListBookmarksHandler<R> {
    repository: R,
}

impl<R> ListBookmarksHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> ListBookmarksHandler<R> {
    /// Returns all visible bookmarks for the creator.
    pub async fn handle(&self, creator_id: i32) -> Result<ListBookmarksResponse, BookmarkError> {
        let bookmarks = self.repository.list_by_creator(creator_id).await?;
        Ok(ListBookmarksResponse {
            bookmarks: bookmarks.into_iter().map(map_bookmark).collect(),
        })
    }
}

/// Handles bookmark updates without depending on transport-specific concerns.
pub struct UpdateBookmarkHandler<R> {
    repository: R,
}

impl<R> UpdateBookmarkHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> UpdateBookmarkHandler<R> {
    /// Replaces the mutable fields of a bookmark and returns the updated view.
    pub async fn handle(
        &self,
        id: &str,
        request: UpdateBookmarkRequest,
        creator_id: i32,
    ) -> Result<UpdateBookmarkResponse, BookmarkError> {
        let now = now_millis();
        let bookmark_id = BookmarkId::new(id);
        let existing = self
            .repository
            .find_by_id_and_creator(&bookmark_id, creator_id)
            .await?
            .ok_or_else(|| BookmarkError::NotFound { id: id.to_string() })?;

        let updated = Bookmark::new(
            bookmark_id,
            creator_id,
            request.url,
            request.title,
            existing.click,
            request.domain,
            request.payload,
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
            .ok_or_else(|| BookmarkError::NotFound { id: id.to_string() })?;
        Ok(UpdateBookmarkResponse {
            bookmark: map_bookmark(saved),
        })
    }
}

/// Handles bookmark soft-deletion.
pub struct DeleteBookmarkHandler<R> {
    repository: R,
}

impl<R> DeleteBookmarkHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> DeleteBookmarkHandler<R> {
    /// Soft-deletes the bookmark and returns the deleted id.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteBookmarkResponse, BookmarkError> {
        let bookmark_id = BookmarkId::new(id);
        let now = now_millis();
        let deleted = self
            .repository
            .soft_delete(&bookmark_id, creator_id, now)
            .await?;
        if !deleted {
            return Err(BookmarkError::NotFound { id: id.to_string() });
        }
        Ok(DeleteBookmarkResponse { id: id.to_string() })
    }
}

/// Handles incrementing the click counter on a bookmark.
pub struct ClickBookmarkHandler<R> {
    repository: R,
}

impl<R> ClickBookmarkHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: BookmarkRepository> ClickBookmarkHandler<R> {
    /// Increments the click counter on the identified bookmark.
    pub async fn handle(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<ClickBookmarkResponse, BookmarkError> {
        let bookmark_id = BookmarkId::new(id);
        let now = now_millis();
        let affected = self
            .repository
            .increment_click(&bookmark_id, creator_id, now)
            .await?;
        if !affected {
            return Err(BookmarkError::NotFound { id: id.to_string() });
        }
        Ok(ClickBookmarkResponse {})
    }
}
