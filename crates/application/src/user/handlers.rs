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

impl From<UserRepositoryError> for UserError {
    fn from(e: UserRepositoryError) -> Self {
        Self::Repository {
            message: e.to_string(),
        }
    }
}
