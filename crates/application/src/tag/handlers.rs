use only_contracts::{
    CreateTagsRequest, CreateTagsResponse, DeleteTagRequest, DeleteTagResponse, ListTagsRequest,
    ListTagsResponse, TagView,
};
use only_domain::{AuditFields, Tag, TagId};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::tag::error::TagError;
use crate::tag::ports::TagRepository;

/// Returns the current Unix timestamp in milliseconds, preferring local time.
fn now_millis() -> i64 {
    OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Maps a domain tag to its public contract view.
fn map_tag(t: Tag) -> TagView {
    TagView {
        id: t.id.to_string(),
        name: t.name,
        group: t.group,
        created_at: t.audit_fields.created_at,
        updated_at: t.audit_fields.updated_at,
    }
}

/// Handles batch tag creation without depending on transport-specific concerns.
pub struct CreateTagsHandler<R> {
    repository: R,
}

impl<R> CreateTagsHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TagRepository> CreateTagsHandler<R> {
    /// Creates one tag record per name in the request batch.
    pub async fn handle(
        &self,
        request: CreateTagsRequest,
        creator_id: i32,
    ) -> Result<CreateTagsResponse, TagError> {
        let now = now_millis();
        for name in &request.tags {
            let id = TagId::new(Uuid::new_v4().to_string());
            let tag = Tag::new(
                id,
                creator_id,
                name,
                &request.group,
                AuditFields::new(now, now, 0, false),
            );
            self.repository.create(tag).await?;
        }
        Ok(CreateTagsResponse {})
    }
}

/// Handles tag listing without depending on transport-specific concerns.
pub struct ListTagsHandler<R> {
    repository: R,
}

impl<R> ListTagsHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TagRepository> ListTagsHandler<R> {
    /// Lists all visible tags for the given group.
    pub async fn handle(
        &self,
        request: ListTagsRequest,
        creator_id: i32,
    ) -> Result<ListTagsResponse, TagError> {
        let tags = self
            .repository
            .list_by_creator_and_group(creator_id, &request.group)
            .await?;
        Ok(ListTagsResponse {
            tags: tags.into_iter().map(map_tag).collect(),
        })
    }
}

/// Handles tag deletion without depending on transport-specific concerns.
pub struct DeleteTagHandler<R> {
    repository: R,
}

impl<R> DeleteTagHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: TagRepository> DeleteTagHandler<R> {
    /// Soft-deletes the tag identified by name and group.
    pub async fn handle(
        &self,
        request: DeleteTagRequest,
        creator_id: i32,
    ) -> Result<DeleteTagResponse, TagError> {
        let now = now_millis();
        self.repository
            .soft_delete_by_name_and_group(creator_id, &request.name, &request.group, now)
            .await?;
        Ok(DeleteTagResponse {})
    }
}
