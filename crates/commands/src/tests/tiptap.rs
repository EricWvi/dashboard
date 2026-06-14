use only_cache_journal::{HistoryEntryV1, JournalDb, SyncStatus, TiptapSchemaV1};
use only_logging::with_trace_logging;
use pretty_assertions::assert_eq;
use serde_json::json;

use crate::CommandError;

use super::make_db;

// ─── CT — add tiptap ─────────────────────────────────────────────────────────

#[test]
fn ct_01_valid_content_returns_id() {
    with_trace_logging(|| {
        let commands = make_db();
        let content = json!({"type": "doc", "content": []});
        let id = commands.add_tiptap(content.clone()).unwrap();

        let doc = commands.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(doc.id, id);
        assert_eq!(doc.content, content);
        assert_eq!(doc.history, vec![]);
    });
}

#[test]
fn ct_03_added_tiptap_visible_on_get() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tiptap(json!({})).unwrap();

        let doc = commands.get_tiptap(&id).unwrap();
        assert!(doc.is_some());
        assert_eq!(doc.unwrap().id, id);
    });
}

// ─── GT — get tiptap ─────────────────────────────────────────────────────────

#[test]
fn gt_01_existing_id_returns_tiptap() {
    with_trace_logging(|| {
        let commands = make_db();
        let content = json!({"v": 1});
        let id = commands.add_tiptap(content.clone()).unwrap();

        let doc = commands.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(doc.content, content);
    });
}

#[test]
fn gt_02_missing_id_returns_none() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.get_tiptap("nonexistent").unwrap();
        assert_eq!(result, None);
    });
}

// ─── UT — update tiptap ──────────────────────────────────────────────────────

#[test]
fn ut_01_valid_update_is_reflected_on_get() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tiptap(json!({"v": 1})).unwrap();
        commands.update_tiptap(&id, json!({"v": 2})).unwrap();

        let doc = commands.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(doc.content, json!({"v": 2}));
    });
}

#[test]
fn ut_02_old_content_moved_to_history() {
    with_trace_logging(|| {
        let commands = make_db();
        let original_content = json!({"v": 1});
        let id = commands.add_tiptap(original_content.clone()).unwrap();
        commands.update_tiptap(&id, json!({"v": 2})).unwrap();

        let doc = commands.get_tiptap(&id).unwrap().unwrap();
        assert_eq!(doc.history.len(), 1);
        assert_eq!(doc.history[0].content, original_content);
    });
}

#[test]
fn ut_03_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.update_tiptap("missing", json!({}));
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

// ─── LH — list tiptap history ────────────────────────────────────────────────

#[test]
fn lh_01_no_history_returns_empty_list() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tiptap(json!({})).unwrap();

        let timestamps = commands.list_tiptap_history(&id).unwrap();
        assert_eq!(timestamps, Vec::<i64>::new());
    });
}

#[test]
fn lh_02_one_update_history_length_one() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tiptap(json!({})).unwrap();
        commands.update_tiptap(&id, json!({"v": 1})).unwrap();

        let timestamps = commands.list_tiptap_history(&id).unwrap();
        assert_eq!(timestamps.len(), 1);
    });
}

#[test]
fn lh_03_two_updates_history_length_two() {
    with_trace_logging(|| {
        // Seed a tiptap with two history entries at known timestamps so ordering is deterministic
        let db = JournalDb::in_memory().unwrap();
        let tiptap = TiptapSchemaV1 {
            id: "t1".to_string(),
            content: json!({"v": 3}),
            history: vec![
                HistoryEntryV1 {
                    time: 2000,
                    content: json!({"v": 2}),
                },
                HistoryEntryV1 {
                    time: 1000,
                    content: json!({"v": 1}),
                },
            ],
            created_at: 500,
            updated_at: 3000,
            is_deleted: false,
        };
        db.tiptaps().upsert(&tiptap, SyncStatus::Pending).unwrap();
        let commands = crate::JournalCommands::new(db);

        let timestamps = commands.list_tiptap_history("t1").unwrap();
        assert_eq!(timestamps.len(), 2);
    });
}

#[test]
fn lh_04_history_sorted_descending() {
    with_trace_logging(|| {
        // Seed a tiptap with known timestamps to verify descending sort
        let db = JournalDb::in_memory().unwrap();
        let tiptap = TiptapSchemaV1 {
            id: "t1".to_string(),
            content: json!({"v": 3}),
            history: vec![
                HistoryEntryV1 {
                    time: 1000,
                    content: json!({"v": 1}),
                },
                HistoryEntryV1 {
                    time: 2000,
                    content: json!({"v": 2}),
                },
            ],
            created_at: 500,
            updated_at: 3000,
            is_deleted: false,
        };
        db.tiptaps().upsert(&tiptap, SyncStatus::Pending).unwrap();
        let commands = crate::JournalCommands::new(db);

        let timestamps = commands.list_tiptap_history("t1").unwrap();
        assert_eq!(timestamps, vec![2000, 1000]);
    });
}

#[test]
fn lh_05_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.list_tiptap_history("missing");
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

// ─── RH — restore tiptap history ─────────────────────────────────────────────

#[test]
fn rh_01_valid_ts_restores_content() {
    with_trace_logging(|| {
        let db = JournalDb::in_memory().unwrap();
        let snapshot_content = json!({"v": 1});
        let tiptap = TiptapSchemaV1 {
            id: "t1".to_string(),
            content: json!({"v": 2}),
            history: vec![HistoryEntryV1 {
                time: 1000,
                content: snapshot_content.clone(),
            }],
            created_at: 500,
            updated_at: 2000,
            is_deleted: false,
        };
        db.tiptaps().upsert(&tiptap, SyncStatus::Pending).unwrap();
        let commands = crate::JournalCommands::new(db);

        commands.restore_tiptap_history("t1", 1000).unwrap();

        let doc = commands.get_tiptap("t1").unwrap().unwrap();
        assert_eq!(doc.content, snapshot_content);
    });
}

#[test]
fn rh_02_missing_tiptap_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.restore_tiptap_history("missing", 1000);
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

#[test]
fn rh_03_missing_ts_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tiptap(json!({})).unwrap();
        let result = commands.restore_tiptap_history(&id, 99999);
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}
