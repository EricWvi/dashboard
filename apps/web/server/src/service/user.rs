use only_application::{FindOrCreateUserHandler, UserError};
use only_db_server::PostgresUserRepository;
use only_domain::User;
use sqlx::{Pool, Postgres};

/// Groups the transport-facing user entry points for the web adapter.
pub struct UserApi {
    find_or_create: FindOrCreateUserHandler<PostgresUserRepository>,
}

impl UserApi {
    /// Builds the user API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            find_or_create: FindOrCreateUserHandler::new(PostgresUserRepository::new(pool)),
        }
    }

    /// Accepts an email and delegates find-or-create to the application handler.
    pub async fn find_or_create(&self, email: &str) -> Result<User, UserError> {
        self.find_or_create.handle(email).await
    }
}
