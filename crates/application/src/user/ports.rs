use std::future::Future;

use only_domain::User;

use crate::user::error::UserRepositoryError;

/// Persistence contract for user account lookup and creation.
///
/// Implementations must operate against the `d_user_v2` table and must never
/// return soft-deleted rows (the user table has no soft-delete column, so all rows are visible).
pub trait UserRepository: Send + Sync {
    /// Returns the existing user for the given email, or creates a new one if absent.
    ///
    /// The upsert guarantees that concurrent first-login requests converge on the same user row.
    fn find_or_create_by_email(
        &self,
        email: &str,
    ) -> impl Future<Output = Result<User, UserRepositoryError>> + Send;
}
