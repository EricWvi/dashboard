use only_logging::{clock, with_trace_logging};
use pretty_assertions::assert_eq;
use serde_json::json;
use time::{Date, Duration, Month};

use super::{local_ts, make_db, make_entry, seed_entries};

// ─── SW — stats: word count ───────────────────────────────────────────────────

#[test]
fn sw_01_no_entries_word_count_zero() {
    with_trace_logging(|| {
        let commands = make_db();
        assert_eq!(commands.count_words().unwrap(), 0);
    });
}

#[test]
fn sw_02_word_count_matches_sum() {
    with_trace_logging(|| {
        let base_ts = 1_750_000_000_000_i64;
        let commands = seed_entries(vec![
            make_entry("e1", base_ts + 2000, 10, "ten words", json!({}), false),
            make_entry("e2", base_ts + 1000, 5, "five words", json!({}), false),
            make_entry("e3", base_ts, 15, "fifteen words", json!({}), false),
        ]);

        assert_eq!(commands.count_words().unwrap(), 30);
    });
}

// ─── SC — stats: current year ─────────────────────────────────────────────────

#[test]
fn sc_01_no_entries_this_year_activity_padded() {
    with_trace_logging(|| {
        let commands = make_db();
        let (activity, total) = commands.get_current_year().unwrap();

        // Total should be 0 when there are no entries
        assert_eq!(total, 0);
        // Activity is padded: must be non-empty (at minimum year-start and today)
        assert!(!activity.is_empty());
        // All padded entries have count = 0
        assert!(activity.iter().all(|d| d.count == 0));

        let now = clock::now_local();
        let year_start = format!("{:04}-01-01", now.year());
        let today_str = format!(
            "{:04}-{:02}-{:02}",
            now.year(),
            now.month() as u8,
            now.day()
        );
        assert_eq!(activity.first().unwrap().date, year_start);
        assert_eq!(activity.last().unwrap().date, today_str);
    });
}

#[test]
fn sc_02_daily_counts_returned() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let commands = seed_entries(vec![
            make_entry("e1", local_ts(today, 10, 0), 1, "morning", json!({}), false),
            make_entry(
                "e2",
                local_ts(today, 14, 0),
                1,
                "afternoon",
                json!({}),
                false,
            ),
        ]);

        let (activity, total) = commands.get_current_year().unwrap();

        assert_eq!(total, 2);

        let today_str = format!(
            "{:04}-{:02}-{:02}",
            today.year(),
            today.month() as u8,
            today.day()
        );
        let today_entry = activity.iter().find(|d| d.date == today_str);
        assert!(today_entry.is_some());
        assert_eq!(today_entry.unwrap().count, 2);

        // year-start must always be present
        let year_start = format!("{:04}-01-01", today.year());
        assert!(activity.iter().any(|d| d.date == year_start));
    });
}

#[test]
fn sc_03_daily_counts_use_local_midnight_boundary() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);

        // 23:55 yesterday → attributed to yesterday; 00:05 today → attributed to today
        let commands = seed_entries(vec![
            make_entry(
                "prev_day",
                local_ts(yesterday, 23, 55),
                1,
                "prev",
                json!({}),
                false,
            ),
            make_entry("new_day", local_ts(today, 0, 5), 1, "new", json!({}), false),
        ]);

        let (activity, _) = commands.get_current_year().unwrap();

        let today_str = format!(
            "{:04}-{:02}-{:02}",
            today.year(),
            today.month() as u8,
            today.day()
        );
        let yesterday_str = format!(
            "{:04}-{:02}-{:02}",
            yesterday.year(),
            yesterday.month() as u8,
            yesterday.day()
        );

        let today_count = activity
            .iter()
            .find(|d| d.date == today_str)
            .map(|d| d.count)
            .unwrap_or(0);
        assert_eq!(today_count, 1, "00:05 should be on today");

        // yesterday may fall outside the current year on Jan 1 — only assert when in-range
        if yesterday.year() == today.year() {
            let yesterday_count = activity
                .iter()
                .find(|d| d.date == yesterday_str)
                .map(|d| d.count)
                .unwrap_or(0);
            assert_eq!(
                yesterday_count, 1,
                "23:55 on yesterday should be on yesterday"
            );
        }
    });
}

// ─── SN — stats: entry count ─────────────────────────────────────────────────

#[test]
fn sn_01_no_entries_count_zero() {
    with_trace_logging(|| {
        let commands = make_db();
        assert_eq!(commands.count_entries().unwrap(), 0);
    });
}

#[test]
fn sn_02_count_matches_entries() {
    with_trace_logging(|| {
        let commands = make_db();
        commands
            .add_entry(None, json!({}), 1, "first".to_string())
            .unwrap();
        commands
            .add_entry(None, json!({}), 1, "second".to_string())
            .unwrap();
        let del = commands
            .add_entry(None, json!({}), 1, "deleted".to_string())
            .unwrap();
        commands.delete_entry(&del).unwrap();

        assert_eq!(commands.count_entries().unwrap(), 2);
    });
}

#[test]
fn sn_03_count_by_year_scoped_to_year() {
    with_trace_logging(|| {
        // Noon on Jan 1 — stays in 2024 local time across all timezones, not pushed into 2023
        let jan_1_2024 = Date::from_calendar_date(2024, Month::January, 1).unwrap();

        let commands = seed_entries(vec![make_entry(
            "e2024",
            local_ts(jan_1_2024, 0, 0),
            1,
            "entry 2024",
            json!({}),
            false,
        )]);

        assert_eq!(commands.count_entries_by_year(2024).unwrap(), 1);
        assert_eq!(commands.count_entries_by_year(2023).unwrap(), 0);
    });
}

// ─── SD — stats: entry dates ─────────────────────────────────────────────────

#[test]
fn sd_01_no_entries_dates_empty() {
    with_trace_logging(|| {
        let commands = make_db();
        let (dates, total) = commands.get_entry_dates().unwrap();
        assert_eq!(dates, vec![]);
        assert_eq!(total, 0);
    });
}

#[test]
fn sd_02_dates_returned_for_entries() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);
        let last_year = Date::from_calendar_date(today.year() - 1, Month::June, 15).unwrap();

        let commands = seed_entries(vec![
            make_entry("e1", local_ts(today, 10, 0), 1, "today entry", json!({}), false),
            make_entry("e2", local_ts(today, 14, 0), 1, "today entry 2", json!({}), false),
            make_entry("e3", local_ts(yesterday, 12, 0), 1, "yesterday entry", json!({}), false),
            make_entry(
                "e4",
                local_ts(last_year, 12, 0),
                1,
                "last year entry",
                json!({}),
                false,
            ),
        ]);

        let (dates, total) = commands.get_entry_dates().unwrap();

        // today + yesterday + last_year → always 3 distinct dates regardless of Jan 1 edge
        assert_eq!(total, 3);

        // Years must be in descending order
        assert_eq!(dates[0].year, today.year());
        assert_eq!(dates[1].year, today.year() - 1);
        for w in dates.windows(2) {
            assert!(w[0].year > w[1].year);
        }

        // Months and days within each year must also be in descending order
        for year_entry in &dates {
            for w in year_entry.months.windows(2) {
                assert!(w[0].month >= w[1].month);
            }
            for month_entry in &year_entry.months {
                for w in month_entry.days.windows(2) {
                    assert!(w[0] >= w[1]);
                }
            }
        }
    });
}

#[test]
fn sd_03_dates_grouped_by_local_day_boundary() {
    with_trace_logging(|| {
        let today = clock::now_local().date();
        let yesterday = today - Duration::days(1);

        let commands = seed_entries(vec![
            // 23:55 yesterday → attributed to yesterday
            make_entry(
                "prev_day",
                local_ts(yesterday, 23, 55),
                1,
                "prev",
                json!({}),
                false,
            ),
            // 00:05 today → attributed to today
            make_entry("new_day", local_ts(today, 0, 5), 1, "new", json!({}), false),
        ]);

        let (dates, total) = commands.get_entry_dates().unwrap();

        // Regardless of year boundary, the two entries must be on different local days
        if yesterday.year() == today.year() {
            assert_eq!(
                total, 2,
                "prev_day and new_day must be on separate local days"
            );

            let year = dates.iter().find(|y| y.year == today.year()).unwrap();
            let all_days: Vec<i32> = year
                .months
                .iter()
                .flat_map(|m| m.days.iter().copied())
                .collect();
            assert!(
                all_days.contains(&(today.day() as i32)),
                "today's day must appear"
            );
            assert!(
                all_days.contains(&(yesterday.day() as i32))
                    || dates.iter().any(|y| y.year == yesterday.year() && {
                        y.months.iter().any(|m| {
                            m.month == yesterday.month() as i32
                                && m.days.contains(&(yesterday.day() as i32))
                        })
                    }),
                "yesterday's day must appear"
            );
        } else {
            // Jan 1 edge case: yesterday is Dec 31 of the previous year
            assert_eq!(total, 2);
        }
    });
}
