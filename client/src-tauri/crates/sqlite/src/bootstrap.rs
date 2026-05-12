use crate::{DatabaseError, DatabaseLocation, MigrationCatalog, RepositoryPool, migration};

#[derive(Debug)]
pub struct Database {
    location: DatabaseLocation,
}

impl Database {
    pub fn repository_pool(&self) -> Result<RepositoryPool, DatabaseError> {
        RepositoryPool::new(&self.location)
    }

    pub fn location(&self) -> &DatabaseLocation {
        &self.location
    }
}

#[derive(Debug, Default)]
pub struct DatabaseBootstrapper;

impl DatabaseBootstrapper {
    pub fn new() -> Self {
        Self
    }

    pub fn bootstrap(
        &self,
        location: DatabaseLocation,
        catalog: &MigrationCatalog,
    ) -> Result<Database, DatabaseError> {
        let mut connection = location.open()?;
        migration::reconcile_database(&mut connection, catalog, current_time_millis)?;
        drop(connection);

        Ok(Database { location })
    }
}

fn current_time_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
