mod entry;
mod tag;
mod tiptap;

pub use entry::EntrySchemaV1;
pub use tag::TagSchemaV1;
pub use tiptap::{HistoryEntryV1, TiptapSchemaV1};

/// Identifies which journal model a schema descriptor refers to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SchemaName {
    Entry,
    Tag,
    Tiptap,
}

/// Pairs a schema name with its declared wire-format version.
/// Used in reconcile calls and as server-side filters for pull/push.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct SchemaDescriptor {
    pub name: SchemaName,
    pub version: u8,
}

/// The complete set of schema versions this build declares to the server.
/// Every reconcile and sync call sends this slice so the server can filter or reject.
pub const SUPPORTED_SCHEMAS: &[SchemaDescriptor] = &[
    SchemaDescriptor {
        name: SchemaName::Entry,
        version: 1,
    },
    SchemaDescriptor {
        name: SchemaName::Tag,
        version: 1,
    },
    SchemaDescriptor {
        name: SchemaName::Tiptap,
        version: 1,
    },
];
