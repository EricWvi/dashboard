use crate::{AuditFields, EchoId, TiptapId};
use serde::{Deserialize, Serialize};

/// Represents an echo record keyed by type, year, and sub-index, optionally backed by a Tiptap draft.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Echo {
    pub id: EchoId,
    pub creator_id: i32,
    /// Free-form type classifier stored in the `e_type` column.
    pub echo_type: String,
    pub year: i32,
    pub sub: i32,
    /// `None` when the zero-UUID sentinel is stored, meaning no draft is attached.
    pub draft: Option<TiptapId>,
    pub mark: bool,
    pub audit_fields: AuditFields,
}

impl Echo {
    /// Creates an echo snapshot together with its persistence-managed audit metadata.
    pub fn new(
        id: EchoId,
        creator_id: i32,
        echo_type: impl Into<String>,
        year: i32,
        sub: i32,
        draft: Option<TiptapId>,
        mark: bool,
        audit_fields: AuditFields,
    ) -> Self {
        Self {
            id,
            creator_id,
            echo_type: echo_type.into(),
            year,
            sub,
            draft,
            mark,
            audit_fields,
        }
    }
}
