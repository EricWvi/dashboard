use std::sync::Arc;

use only_logging::{clock, only_error, only_info};
use only_scheduler::{BoxFuture, Job};
use time::Duration;

use crate::media::error::MediaError;
use crate::media::object_store::ObjectStore;
use crate::media::repository::MediaRepository;

/// Default number of days after which a presigned URL is considered stale and must be refreshed.
const DEFAULT_CUTOFF_DAYS: i64 = 5;

/// The 10-minute forward offset prevents edge cases at the expiry boundary by re-signing
/// slightly earlier than the nominal cutoff would require.
const BOUNDARY_OFFSET: Duration = Duration::minutes(10);

/// Cron job that re-presigns media URLs nearing expiry.
///
/// Registered with the scheduler and also run immediately on startup so the server
/// begins in a consistent state without waiting for the first scheduled tick.
pub struct RePresignExpiredMediaJob<O, R> {
    object_store: Arc<O>,
    repository: Arc<R>,
    cutoff_days: i64,
}

impl<O, R> RePresignExpiredMediaJob<O, R>
where
    O: ObjectStore + 'static,
    R: MediaRepository + 'static,
{
    /// Builds a job with the default 5-day cutoff.
    pub fn new(object_store: Arc<O>, repository: Arc<R>) -> Self {
        Self {
            object_store,
            repository,
            cutoff_days: DEFAULT_CUTOFF_DAYS,
        }
    }

    /// Re-presigns all expired media, returning the counts of successes and failures.
    async fn repressign_expired(&self) -> (usize, usize) {
        // Cutoff = now - cutoff_days + 10 min to create a small forward buffer.
        let cutoff = clock::now_local() - Duration::days(self.cutoff_days) + BOUNDARY_OFFSET;

        let expired = match self.repository.find_expired_presigns(cutoff).await {
            Ok(records) => records,
            Err(err) => {
                only_error!(error = %err, "failed to fetch expired presigns");
                return (0, 0);
            }
        };

        let total = expired.len();
        let mut successes = 0usize;
        let mut failures = 0usize;

        for media in expired {
            let result: Result<(), MediaError> = async {
                let url = self.object_store.presign(&media.key).await?;
                let now = clock::now_local();
                self.repository
                    .update_presigned_url(media.id, url, now)
                    .await?;
                Ok(())
            }
            .await;

            if result.is_ok() {
                successes += 1;
            } else {
                failures += 1;
            }
        }

        only_info!(total, successes, failures, "re-presign run complete",);

        (successes, failures)
    }
}

impl<O, R> Job for RePresignExpiredMediaJob<O, R>
where
    O: ObjectStore + 'static,
    R: MediaRepository + 'static,
{
    fn name(&self) -> &str {
        "re-presign-expired-media"
    }

    fn schedule(&self) -> &str {
        "15 2 * * *"
    }

    fn run(&self) -> BoxFuture<'_> {
        Box::pin(async move {
            self.repressign_expired().await;
        })
    }
}
