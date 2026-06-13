use only_logging::with_trace_logging;
use pretty_assertions::assert_eq;

use crate::CommandError;

use super::make_db;

// ─── LT — list tags ───────────────────────────────────────────────────────────

#[test]
fn lt_01_empty_list_when_no_tags() {
    with_trace_logging(|| {
        let commands = make_db();
        assert_eq!(commands.list_tags().unwrap(), vec![]);
    });
}

#[test]
fn lt_02_returns_all_non_deleted_tags() {
    with_trace_logging(|| {
        let commands = make_db();
        commands.add_tag("alpha".to_string()).unwrap();
        commands.add_tag("beta".to_string()).unwrap();

        let tags = commands.list_tags().unwrap();
        assert_eq!(tags.len(), 2);
    });
}

#[test]
fn lt_04_deleted_tags_excluded() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tag("to-delete".to_string()).unwrap();
        commands.add_tag("keeper".to_string()).unwrap();
        commands.delete_tag(&id).unwrap();

        let tags = commands.list_tags().unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "keeper");
    });
}

#[test]
fn lt_06_results_ordered_by_created_at_asc() {
    with_trace_logging(|| {
        let commands = make_db();
        commands.add_tag("first".to_string()).unwrap();
        commands.add_tag("second".to_string()).unwrap();
        commands.add_tag("third".to_string()).unwrap();

        let tags = commands.list_tags().unwrap();
        for w in tags.windows(2) {
            assert!(w[0].created_at <= w[1].created_at);
        }
    });
}

// ─── CT — add tag ─────────────────────────────────────────────────────────────

#[test]
fn ct_01_add_tag_returns_id() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tag("rust".to_string()).unwrap();

        let tag = commands.get_tag(&id).unwrap().unwrap();
        assert_eq!(tag.id, id);
        assert_eq!(tag.name, "rust");
        assert_eq!(tag.is_deleted, false);
    });
}

#[test]
fn ct_02_multiple_add_tag_calls_all_visible() {
    with_trace_logging(|| {
        let commands = make_db();
        let id1 = commands.add_tag("rust".to_string()).unwrap();
        let id2 = commands.add_tag("go".to_string()).unwrap();

        let tags = commands.list_tags().unwrap();
        let ids: Vec<&str> = tags.iter().map(|t| t.id.as_str()).collect();
        assert!(ids.contains(&id1.as_str()));
        assert!(ids.contains(&id2.as_str()));
    });
}

#[test]
fn ct_03_added_tag_visible_in_list() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tag("visible".to_string()).unwrap();

        let tags = commands.list_tags().unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].id, id);
    });
}

// ─── DT — delete tag ─────────────────────────────────────────────────────────

#[test]
fn dt_01_existing_id_deletes_tag() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tag("to-delete".to_string()).unwrap();
        commands.delete_tag(&id).unwrap();

        let tag = commands.get_tag(&id).unwrap();
        assert_eq!(tag, None);
    });
}

#[test]
fn dt_02_deleted_tag_absent_from_list() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands.add_tag("to-delete".to_string()).unwrap();
        commands.delete_tag(&id).unwrap();

        assert_eq!(commands.list_tags().unwrap(), vec![]);
    });
}

#[test]
fn dt_03_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.delete_tag("nonexistent");
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}
