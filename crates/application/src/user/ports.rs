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

    /// Returns the user with the given id, or `None` if no such row exists.
    fn find_by_id(
        &self,
        id: i32,
    ) -> impl Future<Output = Result<Option<User>, UserRepositoryError>> + Send;

    /// Updates the mutable profile fields (username, avatar, language) for the given user id
    /// and returns the full updated user record.
    fn update_profile(
        &self,
        id: i32,
        username: &str,
        avatar: &str,
        language: &str,
    ) -> impl Future<Output = Result<User, UserRepositoryError>> + Send;
}
