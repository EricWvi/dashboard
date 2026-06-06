use crate::media::error::MediaError;
use crate::media::repository::MediaRepository;

/// Carries the lookup key for a media serve request.
pub struct ServeMediaCommand {
    pub link: String,
}

/// Resolves a media link to its presigned URL for redirect responses.
pub struct ServeMediaHandler<R> {
    pub repository: R,
}

impl<R: MediaRepository> ServeMediaHandler<R> {
    /// Creates a handler backed by the provided repository.
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    /// Returns the presigned URL for a media link.
    ///
    /// Returns [`MediaError::NotFound`] when the record is absent *or* when the stored
    /// `presigned_url` field is `None` or empty — callers should respond with 404 in both cases.
    pub async fn handle(&self, cmd: ServeMediaCommand) -> Result<String, MediaError> {
        let media = self
            .repository
            .find_by_link(&cmd.link)
            .await?
            .ok_or(MediaError::NotFound)?;

        match media.presigned_url.filter(|url| !url.is_empty()) {
            Some(url) => Ok(url),
            None => Err(MediaError::NotFound),
        }
    }
}
