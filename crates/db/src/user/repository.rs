use only_application::{UserRepository, UserRepositoryError};
use only_domain::{User, UserId};
use only_logging::clock;
use sqlx::{Pool, Postgres};

/// PostgreSQL-backed implementation of [`UserRepository`] against the `d_user_v2` table.
pub struct PostgresUserRepository {
    pool: Pool<Postgres>,
}

impl PostgresUserRepository {
    /// Wraps an existing connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }
}

impl UserRepository for PostgresUserRepository {
    async fn find_or_create_by_email(&self, email: &str) -> Result<User, UserRepositoryError> {
        let now_ms = clock::now_millis();

        // Attempt to insert; if the email already exists, do nothing.
        sqlx::query(
            r#"
            INSERT INTO d_user_v2 (email, updated_at)
            VALUES ($1, $2)
            ON CONFLICT (email) DO NOTHING
            "#,
        )
        .bind(email)
        .bind(now_ms)
        .execute(&self.pool)
        .await
        .map_err(|e| UserRepositoryError::OperationFailed(e.to_string()))?;

        let row = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT id, email, updated_at, server_version, avatar, username,
                   rss_token, email_token, email_feed, language
            FROM d_user_v2
            WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| UserRepositoryError::OperationFailed(e.to_string()))?;

        Ok(row_to_user(row))
    }
}

/// Intermediate row type used by sqlx for mapping `d_user_v2` result sets.
#[derive(sqlx::FromRow)]
struct UserRow {
    id: i32,
    email: String,
    updated_at: i64,
    server_version: i64,
    avatar: String,
    username: String,
    rss_token: String,
    email_token: String,
    email_feed: String,
    language: String,
}

/// Maps a raw `d_user_v2` row to the [`User`] domain model.
fn row_to_user(row: UserRow) -> User {
    User::new(
        UserId::new(row.id),
        row.email,
        row.updated_at,
        row.server_version,
        row.avatar,
        row.username,
        row.rss_token,
        row.email_token,
        row.email_feed,
        row.language,
    )
}
