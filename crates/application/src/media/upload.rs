use bytes::Bytes;
use only_logging::clock;
use uuid::Uuid;

use crate::media::error::{MediaError, MediaRepositoryError};
use crate::media::object_store::ObjectStore;
use crate::media::repository::{MediaRepository, NewMedia};

const MAX_KEY_LEN: usize = 1000;

/// Carries the data for a single file upload from a client request.
pub struct UploadMediaCommand {
    pub creator_id: i32,
    pub filename: String,
    pub content_type: String,
    pub data: Bytes,
    /// Optional caller-supplied UUID link alias; the database generates one if absent.
    pub link: Option<Uuid>,
}

/// Orchestrates a single-file upload: stores the object, presigns a URL, persists the record.
pub struct UploadMediaHandler<O, R> {
    pub object_store: O,
    pub repository: R,
}

impl<O: ObjectStore, R: MediaRepository> UploadMediaHandler<O, R> {
    /// Creates a handler backed by the provided object store and repository.
    pub fn new(object_store: O, repository: R) -> Self {
        Self {
            object_store,
            repository,
        }
    }

    /// Uploads one file and returns its link UUID string.
    ///
    /// Key format: `{year}/{month:02}/{unix_timestamp}_{filename}` truncated to 1000 chars.
    /// Content-type is resolved from the filename extension first, then falls back to the
    /// caller-supplied header value.
    pub async fn handle(&self, cmd: UploadMediaCommand) -> Result<String, MediaError> {
        let now = clock::now_local();
        let key = format!(
            "{}/{:02}/{}_{filename}",
            now.year(),
            now.month() as u8,
            now.unix_timestamp(),
            filename = cmd.filename,
        );

        if key.len() > MAX_KEY_LEN {
            return Err(MediaError::KeyTooLong { key_len: key.len() });
        }

        self.object_store
            .upload(&key, cmd.data, &cmd.content_type)
            .await?;

        let presigned_url = self.object_store.presign(&key).await?;

        let new_media = NewMedia {
            creator_id: cmd.creator_id,
            link: cmd.link.map(|u| u.to_string()),
            key,
            presigned_url: Some(presigned_url),
            last_presigned_time: now,
        };

        let media = self
            .repository
            .create(&new_media)
            .await
            .map_err(|e| match e {
                MediaRepositoryError::NotFound => MediaError::NotFound,
                other => MediaError::Repository(other),
            })?;

        Ok(media.link.unwrap_or_default())
    }
}
