use only_domain::User;

use crate::user::error::{UserError, UserRepositoryError};
use crate::user::ports::UserRepository;

/// Resolves a token-extracted email to a stable user record, creating the account on first login.
pub struct FindOrCreateUserHandler<R> {
    repository: R,
}

impl<R> FindOrCreateUserHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: UserRepository> FindOrCreateUserHandler<R> {
    /// Returns the user for the given email, creating a new account if none exists.
    pub async fn handle(&self, email: &str) -> Result<User, UserError> {
        self.repository
            .find_or_create_by_email(email)
            .await
            .map_err(|e| UserError::Repository {
                message: e.to_string(),
            })
    }
}

/// Fetches the authenticated user's profile by their internal id.
pub struct GetUserHandler<R> {
    repository: R,
}

impl<R> GetUserHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: UserRepository> GetUserHandler<R> {
    /// Returns the user record for the given id, or an error if not found.
    pub async fn handle(&self, user_id: i32) -> Result<User, UserError> {
        self.repository
            .find_by_id(user_id)
            .await
            .map_err(|e| UserError::Repository {
                message: e.to_string(),
            })?
            .ok_or_else(|| UserError::Repository {
                message: format!("user {user_id} not found"),
            })
    }
}

/// Updates the authenticated user's mutable profile fields.
pub struct UpdateUserHandler<R> {
    repository: R,
}

impl<R> UpdateUserHandler<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }
}

impl<R: UserRepository> UpdateUserHandler<R> {
    /// Applies the given profile patch and returns the updated user record.
    pub async fn handle(
        &self,
        user_id: i32,
        username: &str,
        avatar: &str,
        language: &str,
    ) -> Result<User, UserError> {
        self.repository
            .update_profile(user_id, username, avatar, language)
            .await
            .map_err(|e| UserError::Repository {
                message: e.to_string(),
            })
    }
}

impl From<UserRepositoryError> for UserError {
    fn from(e: UserRepositoryError) -> Self {
        Self::Repository {
            message: e.to_string(),
        }
    }
}
