/// Identifies a schema by name and wire-format version.
///
/// Sent in reconcile, push, and pull calls so the server can filter or reject
/// unsupported schema versions. Names are app-defined string constants (e.g. "entry", "card").
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct SchemaDescriptor {
    pub name: String,
    pub version: u8,
}

impl SchemaDescriptor {
    pub fn new(name: impl Into<String>, version: u8) -> Self {
        Self {
            name: name.into(),
            version,
        }
    }
}

/// Response from the server after a push, listing which schemas were actually processed.
///
/// Schemas absent from `processed_schemas` were skipped by the server (e.g. the schema
/// version is no longer supported). Records for skipped schemas must remain in pending state.
#[derive(Debug, Clone, Default)]
pub struct PushResult {
    pub processed_schemas: Vec<SchemaDescriptor>,
}
