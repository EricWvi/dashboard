use only_application::{FindOrCreateUserHandler, GetUserHandler, UpdateUserHandler, UserError};
use only_db_server::PostgresUserRepository;
use only_domain::User;
use sqlx::{Pool, Postgres};

/// Groups the transport-facing user entry points for the web adapter.
pub struct UserApi {
    find_or_create: FindOrCreateUserHandler<PostgresUserRepository>,
    get: GetUserHandler<PostgresUserRepository>,
    update: UpdateUserHandler<PostgresUserRepository>,
}

impl UserApi {
    /// Builds the user API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            find_or_create: FindOrCreateUserHandler::new(PostgresUserRepository::new(pool.clone())),
            get: GetUserHandler::new(PostgresUserRepository::new(pool.clone())),
            update: UpdateUserHandler::new(PostgresUserRepository::new(pool)),
        }
    }

    /// Accepts an email and delegates find-or-create to the application handler.
    pub async fn find_or_create(&self, email: &str) -> Result<User, UserError> {
        self.find_or_create.handle(email).await
    }

    /// Returns the user record for the given id.
    pub async fn find_by_id(&self, user_id: i32) -> Result<User, UserError> {
        self.get.handle(user_id).await
    }

    /// Updates username, avatar, and language for the given user id and returns the updated record.
    pub async fn update_profile(
        &self,
        user_id: i32,
        username: &str,
        avatar: &str,
        language: &str,
    ) -> Result<User, UserError> {
        self.update
            .handle(user_id, username, avatar, language)
            .await
    }
}
