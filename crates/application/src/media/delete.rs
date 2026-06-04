use uuid::Uuid;

use crate::media::error::MediaError;
use crate::media::object_store::ObjectStore;
use crate::media::repository::MediaRepository;

/// Carries the IDs of media records the caller wants to remove.
pub struct DeleteMediaCommand {
    pub creator_id: i32,
    pub ids: Vec<Uuid>,
}

/// Reports which deletions succeeded and which failed.
pub struct DeleteMediaResponse {
    pub deleted: Vec<Uuid>,
    pub failed: Vec<Uuid>,
}

/// Orchestrates best-effort deletion: failures are logged and accumulated rather than returned
/// as errors, mirroring the Go implementation that skips failures without aborting the batch.
pub struct DeleteMediaHandler<O, R> {
    pub object_store: O,
    pub repository: R,
}

impl<O: ObjectStore, R: MediaRepository> DeleteMediaHandler<O, R> {
    /// Creates a handler backed by the provided object store and repository.
    pub fn new(object_store: O, repository: R) -> Self {
        Self {
            object_store,
            repository,
        }
    }

    /// Deletes each requested media record and its backing object.
    ///
    /// Per-item failures are swallowed: the response lists both deleted and failed IDs
    /// so callers can decide how to surface partial failures.
    pub async fn handle(&self, cmd: DeleteMediaCommand) -> Result<DeleteMediaResponse, MediaError> {
        let mut deleted = Vec::new();
        let mut failed = Vec::new();

        for id in cmd.ids {
            if self.delete_one(id, cmd.creator_id).await.is_ok() {
                deleted.push(id);
            } else {
                failed.push(id);
            }
        }

        Ok(DeleteMediaResponse { deleted, failed })
    }

    async fn delete_one(&self, id: Uuid, creator_id: i32) -> Result<(), MediaError> {
        let id_str = id.to_string();

        let media = self
            .repository
            .find_by_link(&id_str, creator_id)
            .await?
            .ok_or(MediaError::NotFound)?;

        let key = media.key.clone();

        self.repository.soft_delete(media.id, creator_id).await?;

        self.object_store.delete(&key).await?;

        Ok(())
    }
}
