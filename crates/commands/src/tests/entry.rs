use only_cache_journal::EntryFilter;
use only_logging::{clock, with_trace_logging};
use pretty_assertions::assert_eq;
use serde_json::json;
use time::{Date, Duration, OffsetDateTime};

use crate::CommandError;

use super::{local_ts, make_db, make_entry, seed_entries};

// ─── LE — list entries ────────────────────────────────────────────────────────

#[test]
fn le_01_empty_list_when_no_entries() {
    with_trace_logging(|| {
        let commands = make_db();
        let (entries, has_more) = commands.list_entries(&EntryFilter::default(), 1).unwrap();
        assert_eq!(entries, vec![]);
        assert_eq!(has_more, false);
    });
}

#[test]
fn le_02_returns_first_page_of_entries() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let entries: Vec<_> = (0..10)
            .map(|i| {
                make_entry(
                    &format!("e{i}"),
                    base_ts + i * 1000,
                    1,
                    "text",
                    json!({}),
                    false,
                )
            })
            .collect();
        let commands = seed_entries(entries);

        let (page, has_more) = commands.list_entries(&EntryFilter::default(), 1).unwrap();

        assert_eq!(page.len(), 8);
        assert_eq!(has_more, true);
        // Verify descending created_at order
        for w in page.windows(2) {
            assert!(w[0].created_at >= w[1].created_at);
        }
    });
}

#[test]
fn le_04_filter_by_tag() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry(
                "e1",
                base_ts + 2000,
                1,
                "rust entry",
                json!({"tags": ["rust"]}),
                false,
            ),
            make_entry(
                "e2",
                base_ts + 1000,
                1,
                "go entry",
                json!({"tags": ["go"]}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            tag: Some("rust".to_string()),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "e1");
    });
}

#[test]
fn le_05_search_by_raw_text() {
    with_trace_logging(|| {
        let commands = make_db();
        commands
            .add_entry(None, json!({}), 3, "needle keyword alpha".to_string())
            .unwrap();
        commands
            .add_entry(None, json!({}), 2, "other content beta".to_string())
            .unwrap();

        let results = commands
            .search_entries("needle", &EntryFilter::default())
            .unwrap();

        assert_eq!(results.len(), 1);
        assert!(results[0].raw_text.contains("needle"));
    });
}

#[test]
fn le_06_filter_bookmarked() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry("e1", base_ts + 2000, 1, "bookmarked", json!({}), true),
            make_entry("e2", base_ts + 1000, 1, "not bookmarked", json!({}), false),
        ]);

        let filter = EntryFilter {
            bookmarked: true,
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "e1");
    });
}

#[test]
fn le_08_filter_by_on_date() {
    with_trace_logging(|| {
        let today = OffsetDateTime::now_utc().date();
        let yesterday = today - Duration::days(1);

        let commands = seed_entries(vec![
            make_entry(
                "today",
                local_ts(today, 12, 0),
                1,
                "today",
                json!({}),
                false,
            ),
            make_entry(
                "yesterday",
                local_ts(yesterday, 12, 0),
                1,
                "yesterday",
                json!({}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            on: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "today");
    });
}

#[test]
fn le_09_filter_by_before_date() {
    with_trace_logging(|| {
        let today = OffsetDateTime::now_utc().date();
        let tomorrow = today + Duration::days(1);

        let commands = seed_entries(vec![
            make_entry(
                "today",
                local_ts(today, 12, 0),
                1,
                "today",
                json!({}),
                false,
            ),
            make_entry(
                "tomorrow",
                local_ts(tomorrow, 12, 0),
                1,
                "tomorrow",
                json!({}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            before: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "today");
    });
}

#[test]
fn le_10_filter_today() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);
        // Same month+day one year ago — should also match the today filter
        // Use try_from_calendar_date to gracefully skip Feb 29 on non-leap years
        let last_year_today =
            Date::from_calendar_date(today.year() - 1, today.month(), today.day()).ok();

        let mut entries = vec![
            make_entry(
                "today",
                local_ts(today, 12, 0),
                1,
                "today",
                json!({}),
                false,
            ),
            make_entry(
                "yesterday",
                local_ts(yesterday, 12, 0),
                1,
                "yesterday",
                json!({}),
                false,
            ),
        ];
        if let Some(lyt) = last_year_today {
            entries.push(make_entry(
                "last_year_today",
                local_ts(lyt, 12, 0),
                1,
                "last year today",
                json!({}),
                false,
            ));
        }
        let commands = seed_entries(entries);

        let filter = EntryFilter {
            today: true,
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();
        assert!(ids.contains(&"today"), "today must be included");
        assert!(!ids.contains(&"yesterday"), "yesterday must be excluded");
        if last_year_today.is_some() {
            assert!(
                ids.contains(&"last_year_today"),
                "same month+day last year must be included"
            );
            assert_eq!(entries.len(), 2);
        } else {
            assert_eq!(entries.len(), 1);
        }
    });
}

#[test]
fn le_11_pagination() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let entries: Vec<_> = (0..20)
            .map(|i| {
                make_entry(
                    &format!("e{i:02}"),
                    base_ts + i * 1000,
                    1,
                    "text",
                    json!({}),
                    false,
                )
            })
            .collect();
        let commands = seed_entries(entries);

        let (p1, p1_more) = commands.list_entries(&EntryFilter::default(), 1).unwrap();
        let (p2, p2_more) = commands.list_entries(&EntryFilter::default(), 2).unwrap();
        let (p3, p3_more) = commands.list_entries(&EntryFilter::default(), 3).unwrap();

        assert_eq!(p1.len(), 8);
        assert_eq!(p1_more, true);
        assert_eq!(p2.len(), 8);
        assert_eq!(p2_more, true);
        assert_eq!(p3.len(), 4);
        assert_eq!(p3_more, false);
    });
}

#[test]
fn le_12_filter_by_on_date_uses_local_midnight_boundary() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);

        let commands = seed_entries(vec![
            // 23:55 yesterday → belongs to yesterday
            make_entry(
                "prev_day",
                local_ts(yesterday, 23, 55),
                1,
                "prev",
                json!({}),
                false,
            ),
            // 00:05 today → belongs to today
            make_entry("new_day", local_ts(today, 0, 5), 1, "new", json!({}), false),
        ]);

        let today_filter = EntryFilter {
            on: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&today_filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "new_day");
    });
}

#[test]
fn le_13_filter_by_before_date_includes_local_day_boundary() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let tomorrow = today + Duration::days(1);

        let commands = seed_entries(vec![
            // 00:05 today → should be included in "before today"
            make_entry(
                "today_early",
                local_ts(today, 0, 5),
                1,
                "today",
                json!({}),
                false,
            ),
            // 00:05 tomorrow → should be excluded
            make_entry(
                "tomorrow_early",
                local_ts(tomorrow, 0, 5),
                1,
                "tomorrow",
                json!({}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            before: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "today_early");
    });
}

#[test]
fn le_14_filter_today_uses_local_month_day_boundary() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);

        let commands = seed_entries(vec![
            make_entry("today", local_ts(today, 0, 0), 1, "today", json!({}), false),
            make_entry(
                "yesterday",
                local_ts(yesterday, 23, 59),
                1,
                "yesterday",
                json!({}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            today: true,
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, "today");
    });
}

#[test]
fn le_15_filter_by_location_single_component() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry(
                "e1",
                base_ts + 5000,
                1,
                "a",
                json!({"location": ["A"]}),
                false,
            ),
            make_entry(
                "e2",
                base_ts + 4000,
                1,
                "a bb",
                json!({"location": ["A", "B B"]}),
                false,
            ),
            make_entry(
                "e3",
                base_ts + 3000,
                1,
                "a bb c",
                json!({"location": ["A", "B B", "C"]}),
                false,
            ),
            make_entry(
                "e4",
                base_ts + 2000,
                1,
                "a bb d",
                json!({"location": ["A", "B B", "D"]}),
                false,
            ),
            make_entry(
                "e5",
                base_ts + 1000,
                1,
                "bb only",
                json!({"location": ["B B"]}),
                false,
            ),
            make_entry("e6", base_ts, 1, "no loc", json!({}), false),
        ]);

        let filter = EntryFilter {
            location: vec!["A".to_string()],
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();
        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, vec!["e1", "e2", "e3", "e4"]);
    });
}

#[test]
fn le_16_filter_by_location_two_components() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry(
                "e1",
                base_ts + 4000,
                1,
                "a bb",
                json!({"location": ["A", "B B"]}),
                false,
            ),
            make_entry(
                "e2",
                base_ts + 3000,
                1,
                "a bb c",
                json!({"location": ["A", "B B", "C"]}),
                false,
            ),
            make_entry(
                "e3",
                base_ts + 2000,
                1,
                "a bb d",
                json!({"location": ["A", "B B", "D"]}),
                false,
            ),
            make_entry(
                "e4",
                base_ts + 1000,
                1,
                "a only",
                json!({"location": ["A"]}),
                false,
            ),
            make_entry(
                "e5",
                base_ts,
                1,
                "a c",
                json!({"location": ["A", "C"]}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            location: vec!["A".to_string(), "B B".to_string()],
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();
        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, vec!["e1", "e2", "e3"]);
    });
}

#[test]
fn le_17_filter_by_location_three_components() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry(
                "e1",
                base_ts + 3000,
                1,
                "a bb c",
                json!({"location": ["A", "B B", "C"]}),
                false,
            ),
            make_entry(
                "e2",
                base_ts + 2000,
                1,
                "a bb",
                json!({"location": ["A", "B B"]}),
                false,
            ),
            make_entry(
                "e3",
                base_ts + 1000,
                1,
                "a bb d",
                json!({"location": ["A", "B B", "D"]}),
                false,
            ),
        ]);

        let filter = EntryFilter {
            location: vec!["A".to_string(), "B B".to_string(), "C".to_string()],
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();
        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, vec!["e1"]);
    });
}

const CHAN_RAW_TEXT: &str = "我是陈冠希呀，我现在在LA啊，我遇到一些很坏很坏的人，一些gangster， you know？现在我需要你的帮助，微信转账300块，帮我回到香港，你懂我意思吗，我对你敬礼啊，Salute";

#[test]
fn le_20_search_mixed_cjk_and_latin_queries() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 30, CHAN_RAW_TEXT.to_string())
            .unwrap();
        commands
            .add_entry(None, json!({}), 2, "nothing here".to_string())
            .unwrap();

        for query in &[
            "香",
            "香港",
            "陈冠希",
            "微信转账",
            "LA",
            "you know",
            "转账300",
        ] {
            let results = commands
                .search_entries(query, &EntryFilter::default())
                .unwrap();
            assert_eq!(
                results.len(),
                1,
                "query {query:?} should match exactly one entry"
            );
            assert_eq!(
                results[0].id, id,
                "query {query:?} should return the target entry"
            );
        }
    });
}

#[test]
fn le_18_combined_filter_list_tag_location_bookmarked_on() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - time::Duration::days(1);
        let base_ts = 1_750_000_000_000_i64;

        let commands = seed_entries(vec![
            // e1: matches all four filters
            make_entry(
                "e1",
                local_ts(today, 12, 0),
                1,
                "rust home today",
                json!({"tags": ["rust"], "location": ["Home"]}),
                true,
            ),
            // e2: wrong tag
            make_entry(
                "e2",
                local_ts(today, 11, 0),
                1,
                "go home today",
                json!({"tags": ["go"], "location": ["Home"]}),
                true,
            ),
            // e3: wrong location
            make_entry(
                "e3",
                local_ts(today, 10, 0),
                1,
                "rust work today",
                json!({"tags": ["rust"], "location": ["Work"]}),
                true,
            ),
            // e4: not bookmarked
            make_entry(
                "e4",
                local_ts(today, 9, 0),
                1,
                "rust home today unbookmarked",
                json!({"tags": ["rust"], "location": ["Home"]}),
                false,
            ),
            // e5: wrong date (yesterday)
            make_entry(
                "e5",
                local_ts(yesterday, 12, 0),
                1,
                "rust home yesterday",
                json!({"tags": ["rust"], "location": ["Home"]}),
                true,
            ),
            // e6: no tag at all (ensure base_ts ordering doesn't collide)
            make_entry("e6", base_ts, 1, "no tag no loc", json!({}), false),
        ]);

        let filter = EntryFilter {
            tag: Some("rust".to_string()),
            location: vec!["Home".to_string()],
            bookmarked: true,
            on: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();
        let ids: Vec<&str> = entries.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, vec!["e1"]);
    });
}

#[test]
fn le_19_combined_filter_search_query_tag_location_bookmarked_on() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - time::Duration::days(1);

        let commands = seed_entries(vec![
            // e1: matches query + all four filters
            make_entry(
                "e1",
                local_ts(today, 12, 0),
                3,
                "horizon rust home",
                json!({"tags": ["rust"], "location": ["Home"]}),
                true,
            ),
            // e2: query miss — no "horizon"
            make_entry(
                "e2",
                local_ts(today, 11, 0),
                3,
                "zenith rust home",
                json!({"tags": ["rust"], "location": ["Home"]}),
                true,
            ),
            // e3: wrong tag
            make_entry(
                "e3",
                local_ts(today, 10, 0),
                3,
                "horizon go home",
                json!({"tags": ["go"], "location": ["Home"]}),
                true,
            ),
            // e4: wrong location
            make_entry(
                "e4",
                local_ts(today, 9, 0),
                3,
                "horizon rust work",
                json!({"tags": ["rust"], "location": ["Work"]}),
                true,
            ),
            // e5: not bookmarked
            make_entry(
                "e5",
                local_ts(today, 8, 0),
                3,
                "horizon rust home",
                json!({"tags": ["rust"], "location": ["Home"]}),
                false,
            ),
            // e6: wrong date (yesterday)
            make_entry(
                "e6",
                local_ts(yesterday, 12, 0),
                3,
                "horizon rust home",
                json!({"tags": ["rust"], "location": ["Home"]}),
                true,
            ),
        ]);

        let filter = EntryFilter {
            tag: Some("rust".to_string()),
            location: vec!["Home".to_string()],
            bookmarked: true,
            on: Some(format!(
                "{:04}-{:02}-{:02}",
                today.year(),
                today.month() as u8,
                today.day()
            )),
            ..Default::default()
        };
        let results = commands.search_entries("horizon", &filter).unwrap();
        let ids: Vec<&str> = results.iter().map(|e| e.id.as_str()).collect();

        assert_eq!(ids, vec!["e1"]);
    });
}

// ─── CE — add entry ───────────────────────────────────────────────────────────

#[test]
fn ce_01_valid_inputs_returns_id() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(
                None,
                json!({"tags": ["rust"]}),
                3,
                "hello world rust".to_string(),
            )
            .unwrap();

        let entry = commands.get_entry(&id).unwrap().unwrap();
        assert_eq!(entry.id, id);
        assert_eq!(entry.draft, None);
        assert_eq!(entry.payload, json!({"tags": ["rust"]}));
        assert_eq!(entry.word_count, 3);
        assert_eq!(entry.raw_text, "hello world rust");
        assert_eq!(entry.bookmark, false);
    });
}

#[test]
fn ce_03_added_entry_visible_in_list() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "visible".to_string())
            .unwrap();

        let (entries, _) = commands.list_entries(&EntryFilter::default(), 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, id);
    });
}

// ─── GE — get entry ───────────────────────────────────────────────────────────

#[test]
fn ge_01_existing_id_returns_entry() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 2, "find me".to_string())
            .unwrap();

        let result = commands.get_entry(&id).unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().raw_text, "find me");
    });
}

#[test]
fn ge_02_missing_id_returns_none() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.get_entry("nonexistent-id").unwrap();
        assert_eq!(result, None);
    });
}

// ─── UE — update entry ────────────────────────────────────────────────────────

#[test]
fn ue_01_valid_update_is_reflected_on_get() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "original".to_string())
            .unwrap();

        commands
            .update_entry(
                &id,
                Some("draft-id".to_string()),
                json!({"tags": ["updated"]}),
                5,
                "updated content".to_string(),
            )
            .unwrap();

        let entry = commands.get_entry(&id).unwrap().unwrap();
        assert_eq!(entry.draft, Some("draft-id".to_string()));
        assert_eq!(entry.payload, json!({"tags": ["updated"]}));
        assert_eq!(entry.word_count, 5);
        assert_eq!(entry.raw_text, "updated content");
    });
}

#[test]
fn ue_02_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.update_entry("missing", None, json!({}), 0, "x".to_string());
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

// ─── DE — delete entry ────────────────────────────────────────────────────────

#[test]
fn de_01_existing_id_deletes_entry() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "to delete".to_string())
            .unwrap();

        commands.delete_entry(&id).unwrap();

        let entry = commands.get_entry(&id).unwrap();
        assert_eq!(entry, None);
    });
}

#[test]
fn de_02_deleted_entry_absent_from_list() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "to delete".to_string())
            .unwrap();
        commands.delete_entry(&id).unwrap();

        let (entries, _) = commands.list_entries(&EntryFilter::default(), 1).unwrap();

        assert_eq!(entries, vec![]);
    });
}

#[test]
fn de_03_deleted_entry_returns_none_on_get() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "delete me".to_string())
            .unwrap();
        commands.delete_entry(&id).unwrap();

        assert_eq!(commands.get_entry(&id).unwrap(), None);
    });
}

#[test]
fn de_04_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.delete_entry("missing");
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

// ─── BK — bookmark entry ─────────────────────────────────────────────────────

#[test]
fn bk_01_bookmark_sets_flag_true() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "to bookmark".to_string())
            .unwrap();
        commands.bookmark_entry(&id).unwrap();

        let entry = commands.get_entry(&id).unwrap().unwrap();
        assert_eq!(entry.bookmark, true);
    });
}

#[test]
fn bk_02_bookmarked_entry_in_filter() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "bookmarked".to_string())
            .unwrap();
        commands.bookmark_entry(&id).unwrap();

        let filter = EntryFilter {
            bookmarked: true,
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].id, id);
    });
}

#[test]
fn bk_03_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.bookmark_entry("missing");
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}

// ─── UB — unbookmark entry ────────────────────────────────────────────────────

#[test]
fn ub_01_unbookmark_sets_flag_false() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "was bookmarked".to_string())
            .unwrap();
        commands.bookmark_entry(&id).unwrap();
        commands.unbookmark_entry(&id).unwrap();

        let entry = commands.get_entry(&id).unwrap().unwrap();
        assert_eq!(entry.bookmark, false);
    });
}

#[test]
fn ub_02_unbookmarked_entry_excluded_from_filter() {
    with_trace_logging(|| {
        let commands = make_db();
        let id = commands
            .add_entry(None, json!({}), 1, "was bookmarked".to_string())
            .unwrap();
        commands.bookmark_entry(&id).unwrap();
        commands.unbookmark_entry(&id).unwrap();

        let filter = EntryFilter {
            bookmarked: true,
            ..Default::default()
        };
        let (entries, _) = commands.list_entries(&filter, 1).unwrap();

        assert_eq!(entries, vec![]);
    });
}

#[test]
fn ub_03_missing_id_returns_not_found() {
    with_trace_logging(|| {
        let commands = make_db();
        let result = commands.unbookmark_entry("missing");
        assert!(matches!(result, Err(CommandError::NotFound(_))));
    });
}
