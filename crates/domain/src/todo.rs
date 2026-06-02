use crate::{AuditFields, CollectionId, TiptapId, TodoId};
use serde::{Deserialize, Serialize};

/// Represents a todo item that may belong to a collection, a kanban board, and carry scheduling metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Todo {
    pub id: TodoId,
    pub creator_id: i32,
    pub title: String,
    pub completed: bool,
    /// `None` when the zero-UUID sentinel is stored, meaning the todo is in `Inbox`.
    pub collection_id: Option<CollectionId>,
    /// Task difficulty rating; `None` when unset (the schema uses -1 as a sentinel).
    pub difficulty: Option<i32>,
    /// Display order hint; `None` when the todo is unordered. Stored as `d_order` in the schema.
    pub order: Option<i32>,
    pub link: Option<String>,
    /// `None` when the zero-UUID sentinel is stored, meaning no draft is attached.
    pub draft: Option<TiptapId>,
    pub schedule: Option<i64>,
    pub done: bool,
    /// Repeat or completion count. Stored as `d_count` in the schema.
    pub count: i32,
    /// Kanban board identifier; `None` when the zero-UUID sentinel is stored.
    /// No dedicated kanban entity exists in the current schema.
    pub kanban: Option<String>,
    pub audit_fields: AuditFields,
}

impl Todo {
    /// Creates a todo snapshot together with its persistence-managed audit metadata.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: TodoId,
        creator_id: i32,
        title: impl Into<String>,
        completed: bool,
        collection_id: Option<CollectionId>,
        difficulty: Option<i32>,
        order: Option<i32>,
        link: Option<String>,
        draft: Option<TiptapId>,
        schedule: Option<i64>,
        done: bool,
        count: i32,
        kanban: Option<String>,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            title: title.into(),
            completed,
            collection_id,
            difficulty,
            order,
            link,
            draft,
            schedule,
            done,
            count,
            kanban,
            audit_fields,
        }
    }
}
