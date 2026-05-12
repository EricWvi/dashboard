use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub key: String,
    pub username: String,
    pub email: String,
    pub avatar: String,
    pub language: String,
    pub updated_at: i64,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub draft: String,
    pub payload: serde_json::Value,
    pub word_count: i64,
    pub raw_text: String,
    pub bookmark: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryField {
    pub draft: String,
    pub payload: serde_json::Value,
    pub word_count: i64,
    pub raw_text: String,
    pub bookmark: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryMeta {
    pub id: String,
    pub draft: String,
    pub year: i64,
    pub month: i64,
    pub day: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagField {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistoryEntry {
    pub time: i64,
    pub content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TiptapV2 {
    pub id: String,
    pub content: serde_json::Value,
    pub history: Vec<HistoryEntry>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_deleted: bool,
    pub sync_status: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TiptapV2Field {
    pub content: serde_json::Value,
    pub history: Vec<HistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncMeta {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistic {
    #[serde(rename = "stKey")]
    pub st_key: String,
    #[serde(rename = "stValue")]
    pub st_value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalData {
    pub entries: Vec<Entry>,
    pub tags: Vec<Tag>,
    pub tiptaps: Vec<TiptapV2>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryCondition {
    pub operator: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEntriesResult {
    pub entries: Vec<EntryMeta>,
    pub has_more: bool,
}
