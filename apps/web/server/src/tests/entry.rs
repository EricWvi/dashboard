use std::collections::{BTreeMap, BTreeSet, HashSet};

use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use only_contracts::{
    BookmarkEntryResponse, CreateEntryResponse, DailyCount, DeleteEntryResponse, EntryView,
    GetCurrentYearResponse, GetEntriesCountResponse, GetEntryDatesResponse, GetEntryResponse,
    GetWordsCountResponse, ListEntriesResponse, MonthEntry, UnbookmarkEntryResponse,
    UpdateEntryResponse, YearEntry,
};
use pretty_assertions::assert_eq;
use serde_json::{Value, json};
use sqlx::{Pool, Postgres};
use time::{Date, Duration, Month, OffsetDateTime, PrimitiveDateTime, Time};
use uuid::Uuid;

use super::{bootstrap_test_state_with_pool, send, with_auth};
use crate::app_state::AppState;

const SEEDED_EMAIL: &str = "seeded-entry@test.com";

#[derive(Clone)]
struct SeededEntry {
    id: String,
    created_at: i64,
    word_count: i32,
    bookmark: bool,
    payload: Value,
    raw_text: String,
    date: String,
}

struct SeedFixture {
    email: String,
    all_ids: HashSet<String>,
    page_one_ids: Vec<String>,
    tag_test1_ids: Vec<String>,
    bookmarked_ids: Vec<String>,
    random_expected_len: usize,
    contains_id: String,
    on_date: String,
    on_date_ids: Vec<String>,
    before_date: String,
    before_date_ids: Vec<String>,
    today_ids: Vec<String>,
    total_words: i64,
    total_entries: i64,
    current_year_count: i32,
    current_year_first_date: String,
    current_year_last_date: String,
    dates_response: GetEntryDatesResponse,
}

struct BoundaryFixture {
    email: String,
    target_date: String,
    previous_date: String,
    on_ids: Vec<String>,
    before_ids: Vec<String>,
    today_ids: Vec<String>,
    dates_response: GetEntryDatesResponse,
}

async fn parse_json<T: serde::de::DeserializeOwned>(resp: Response<Body>) -> T {
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .expect("failed to collect response body");
    serde_json::from_slice(&bytes).expect("failed to deserialize response JSON")
}

/// Inserts one seeded entry row directly so tests can control precise local-day boundaries.
async fn insert_seed_entry(
    pool: &Pool<Postgres>,
    creator_id: i32,
    date: Date,
    hour: u8,
    minute: u8,
    payload: Value,
    word_count: i32,
    raw_text: &str,
    bookmark: bool,
) -> SeededEntry {
    let id = Uuid::new_v4().to_string();
    let draft = Uuid::new_v4().to_string();
    let created_at = local_timestamp_millis(date, hour, minute);
    let updated_at = created_at + 60_000;
    let payload_text = payload.to_string();
    sqlx::query(
        r#"
        INSERT INTO d_entry_v2
            (id, creator_id, draft, payload, word_count, raw_text, bookmark, review_count,
             created_at, updated_at, is_deleted)
        VALUES
            ($1::uuid, $2, $3::uuid, $4::jsonb, $5, $6, $7, $8, $9, $10, FALSE)
        "#,
    )
    .bind(&id)
    .bind(creator_id)
    .bind(&draft)
    .bind(&payload_text)
    .bind(word_count)
    .bind(raw_text)
    .bind(bookmark)
    .bind(0_i32)
    .bind(created_at)
    .bind(updated_at)
    .execute(pool)
    .await
    .expect("failed to seed entry");

    SeededEntry {
        id,
        created_at,
        word_count,
        bookmark,
        payload,
        raw_text: raw_text.to_string(),
        date: format_date(date),
    }
}

/// Creates an entry through the HTTP handler and returns the saved view.
async fn create_entry(
    state: &AppState,
    email: &str,
    draft: Option<&str>,
    payload: Value,
    word_count: i32,
    raw_text: &str,
) -> EntryView {
    let body = json!({
        "draft": draft,
        "payload": payload,
        "wordCount": word_count,
        "rawText": raw_text
    });
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/entries")
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: CreateEntryResponse = parse_json(resp).await;
    body.entry
}

/// Loads one entry by id through the HTTP handler.
async fn get_entry(state: &AppState, email: &str, id: &str) -> Response<Body> {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri(format!("/api/entries/{id}")),
        email,
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await
}

/// Lists entries through the HTTP handler using the provided query string.
async fn list_entries(state: &AppState, email: &str, query: &str) -> ListEntriesResponse {
    let uri = if query.is_empty() {
        "/api/entries".to_string()
    } else {
        format!("/api/entries?{query}")
    };
    let req = with_auth(Request::builder().method("GET").uri(uri), email)
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    parse_json(resp).await
}

/// Updates an entry through the HTTP handler and returns the full HTTP response.
async fn update_entry(
    state: &AppState,
    email: &str,
    id: &str,
    draft: Option<&str>,
    payload: Value,
    word_count: i32,
    raw_text: &str,
    bookmark: bool,
) -> Response<Body> {
    let body = json!({
        "draft": draft,
        "payload": payload,
        "wordCount": word_count,
        "rawText": raw_text,
        "bookmark": bookmark
    });
    let req = with_auth(
        Request::builder()
            .method("PUT")
            .uri(format!("/api/entries/{id}"))
            .header("content-type", "application/json"),
        email,
    )
    .body(Body::from(body.to_string()))
    .unwrap();
    send(state.clone(), req).await
}

/// Deletes an entry through the HTTP handler and returns the full HTTP response.
async fn delete_entry(state: &AppState, email: &str, id: &str) -> Response<Body> {
    let req = with_auth(
        Request::builder()
            .method("DELETE")
            .uri(format!("/api/entries/{id}")),
        email,
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await
}

/// Sends the bookmark-entry command for one entry.
async fn bookmark_entry(state: &AppState, email: &str, id: &str) -> Response<Body> {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/entries/{id}/bookmark")),
        email,
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await
}

/// Sends the unbookmark-entry command for one entry.
async fn unbookmark_entry(state: &AppState, email: &str, id: &str) -> Response<Body> {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri(format!("/api/entries/{id}/unbookmark")),
        email,
    )
    .body(Body::empty())
    .unwrap();
    send(state.clone(), req).await
}

/// Loads the word-count stats endpoint.
async fn get_words_count(state: &AppState, email: &str) -> GetWordsCountResponse {
    let req = with_auth(
        Request::builder().method("GET").uri("/api/entries/stats/words"),
        email,
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    parse_json(resp).await
}

/// Loads the current-year stats endpoint.
async fn get_current_year(state: &AppState, email: &str) -> GetCurrentYearResponse {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/entries/stats/current-year"),
        email,
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    parse_json(resp).await
}

/// Loads the count stats endpoint.
async fn get_entries_count(state: &AppState, email: &str, query: &str) -> GetEntriesCountResponse {
    let uri = if query.is_empty() {
        "/api/entries/stats/count".to_string()
    } else {
        format!("/api/entries/stats/count?{query}")
    };
    let req = with_auth(Request::builder().method("GET").uri(uri), email)
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    parse_json(resp).await
}

/// Loads the hierarchical entry-date stats endpoint.
async fn get_entry_dates(state: &AppState, email: &str) -> GetEntryDatesResponse {
    let req = with_auth(
        Request::builder()
            .method("GET")
            .uri("/api/entries/stats/dates"),
        email,
    )
    .body(Body::empty())
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    parse_json(resp).await
}

/// Builds a stable local-time timestamp for the given date and clock time.
fn local_timestamp_millis(date: Date, hour: u8, minute: u8) -> i64 {
    let local_offset = OffsetDateTime::now_local()
        .map(|now| now.offset())
        .unwrap_or(time::UtcOffset::UTC);
    PrimitiveDateTime::new(date, Time::from_hms(hour, minute, 0).unwrap())
        .assume_offset(local_offset)
        .unix_timestamp_nanos() as i64
        / 1_000_000
}

/// Formats a local calendar date using the route's `YYYY-MM-DD` convention.
fn format_date(date: Date) -> String {
    format!("{:04}-{:02}-{:02}", date.year(), date.month() as u8, date.day())
}

/// Finds a previous-year date that preserves the current month/day pair.
fn previous_same_month_day(today: Date) -> Date {
    for years_back in 1..=8 {
        if let Ok(date) =
            Date::from_calendar_date(today.year() - years_back, today.month(), today.day())
        {
            return date;
        }
    }
    panic!("failed to find a valid previous-year date for {}", format_date(today));
}

/// Groups distinct seeded date strings into the expected stats response shape.
fn build_dates_response(entries: &[SeededEntry]) -> GetEntryDatesResponse {
    let unique_dates: BTreeSet<String> = entries.iter().map(|entry| entry.date.clone()).collect();
    let mut years: BTreeMap<i32, BTreeMap<i32, Vec<i32>>> = BTreeMap::new();

    for date in &unique_dates {
        let parts: Vec<i32> = date
            .split('-')
            .map(|segment| segment.parse::<i32>().expect("date segment must be numeric"))
            .collect();
        years
            .entry(parts[0])
            .or_default()
            .entry(parts[1])
            .or_default()
            .push(parts[2]);
    }

    let entry_dates = years
        .into_iter()
        .rev()
        .map(|(year, months)| YearEntry {
            year,
            months: months
                .into_iter()
                .rev()
                .map(|(month, mut days)| {
                    days.sort_unstable_by(|left, right| right.cmp(left));
                    MonthEntry { month, days }
                })
                .collect(),
        })
        .collect::<Vec<_>>();

    GetEntryDatesResponse {
        total: unique_dates.len() as i32,
        entry_dates,
    }
}

/// Seeds twenty relative-date entries for a dedicated test user and returns the expected facts.
async fn seed_entries(state: &AppState, pool: &Pool<Postgres>) -> SeedFixture {
    let user = state
        .user_api
        .find_or_create(SEEDED_EMAIL)
        .await
        .expect("failed to create seeded test user");
    let creator_id = user.id.value();
    let today = OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .date();
    let jan_first = Date::from_calendar_date(today.year(), Month::January, 1)
        .expect("current year Jan 1 must be valid");
    let on_date = today - Duration::days(10);
    let before_cutoff = today - Duration::days(450);
    let same_day_previous_year = previous_same_month_day(today);

    let specs = vec![
        (today, 21, 0, json!({ "tags": ["test1"], "location": ["City", "Downtown"] }), 5, "today alpha entry", false),
        (today, 20, 0, json!({ "tags": ["test2"], "location": ["City", "Riverside"] }), 7, "today beta bookmark", true),
        (today - Duration::days(1), 19, 0, json!({ "tags": [] }), 3, "yesterday gamma", false),
        (today - Duration::days(5), 18, 0, json!({ "tags": ["test1", "test2"] }), 11, "needle-alpha contains keyword", true),
        (on_date, 17, 0, json!({ "tags": ["test1"] }), 13, "on date first", false),
        (on_date, 16, 0, json!({ "tags": [] }), 2, "on date second", false),
        (today - Duration::days(20), 15, 0, json!({ "tags": [] }), 4, "twenty days old", false),
        (today - Duration::days(40), 14, 0, json!({ "tags": ["travel"] }), 8, "forty days old", false),
        (today - Duration::days(80), 13, 0, json!({ "tags": ["test2"] }), 6, "eighty days old", true),
        (today - Duration::days(120), 12, 0, json!({ "tags": [] }), 9, "one twenty", false),
        (today - Duration::days(160), 11, 0, json!({ "tags": [] }), 10, "one sixty", false),
        (jan_first, 10, 0, json!({ "tags": [] }), 1, "year start", false),
        (same_day_previous_year, 9, 0, json!({ "tags": ["anniversary"] }), 12, "previous year same month day", false),
        (today - Duration::days(370), 8, 0, json!({ "tags": [] }), 14, "three seventy", false),
        (today - Duration::days(400), 7, 0, json!({ "tags": ["archive"] }), 15, "four hundred", false),
        (today - Duration::days(500), 6, 0, json!({ "tags": [] }), 16, "five hundred", false),
        (today - Duration::days(800), 5, 0, json!({ "tags": [] }), 17, "eight hundred", true),
        (today - Duration::days(1_000), 4, 0, json!({ "tags": ["test1"] }), 18, "one thousand", false),
        (today - Duration::days(1_200), 3, 0, json!({ "tags": [] }), 19, "twelve hundred", false),
        (today - Duration::days(1_500), 2, 0, json!({ "tags": [] }), 20, "fifteen hundred", false),
    ];

    let mut entries = Vec::with_capacity(specs.len());
    for (date, hour, minute, payload, word_count, raw_text, bookmark) in specs {
        entries.push(
            insert_seed_entry(
                pool, creator_id, date, hour, minute, payload, word_count, raw_text, bookmark,
            )
            .await,
        );
    }

    entries.sort_by(|left, right| right.created_at.cmp(&left.created_at));

    let total_words = entries.iter().map(|entry| i64::from(entry.word_count)).sum();
    let page_one_ids = entries
        .iter()
        .take(8)
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let tag_test1_ids = entries
        .iter()
        .filter(|entry| {
            entry
                .payload
                .get("tags")
                .and_then(Value::as_array)
                .is_some_and(|tags| tags.iter().any(|tag| tag == "test1"))
        })
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let bookmarked_ids = entries
        .iter()
        .filter(|entry| entry.bookmark)
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let on_date_string = format_date(on_date);
    let on_date_ids = entries
        .iter()
        .filter(|entry| entry.date == on_date_string)
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let before_date_string = format_date(before_cutoff);
    let before_date_ids = entries
        .iter()
        .filter(|entry| entry.date <= before_date_string)
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let today_ids = entries
        .iter()
        .filter(|entry| {
            let parts = entry
                .date
                .split('-')
                .map(|segment| segment.parse::<i32>().expect("date segment must be numeric"))
                .collect::<Vec<_>>();
            parts[1] == today.month() as i32 && parts[2] == i32::from(today.day())
        })
        .map(|entry| entry.id.clone())
        .collect::<Vec<_>>();
    let current_year_entries = entries
        .iter()
        .filter(|entry| entry.date.starts_with(&format!("{:04}-", today.year())))
        .map(|entry| entry.date.clone())
        .collect::<Vec<_>>();
    let contains_id = entries
        .iter()
        .find(|entry| entry.raw_text.contains("needle-alpha"))
        .expect("needle entry must exist")
        .id
        .clone();
    let dates_response = build_dates_response(&entries);
    let current_year_first_date = format!("{:04}-01-01", today.year());
    let current_year_last_date = format_date(today);

    SeedFixture {
        email: SEEDED_EMAIL.to_string(),
        all_ids: entries.iter().map(|entry| entry.id.clone()).collect(),
        page_one_ids,
        tag_test1_ids,
        bookmarked_ids,
        random_expected_len: 8,
        contains_id,
        on_date: on_date_string,
        on_date_ids,
        before_date: before_date_string,
        before_date_ids,
        today_ids,
        total_words,
        total_entries: entries.len() as i64,
        current_year_count: current_year_entries.len() as i32,
        current_year_first_date,
        current_year_last_date,
        dates_response,
    }
}

/// Seeds entries around Asia/Shanghai midnight so date-based filters can assert local boundaries.
async fn seed_boundary_entries(state: &AppState, pool: &Pool<Postgres>) -> BoundaryFixture {
    let email = "entry-boundary@test.com";
    let user = state
        .user_api
        .find_or_create(email)
        .await
        .expect("failed to create boundary test user");
    let creator_id = user.id.value();
    let today = OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .date();
    let yesterday = today - Duration::days(1);
    let tomorrow = today + Duration::days(1);
    let same_day_previous_year = previous_same_month_day(today);

    let previous_day_entry = insert_seed_entry(
        pool,
        creator_id,
        yesterday,
        23,
        55,
        json!({ "tags": ["boundary"] }),
        1,
        "boundary previous day 23:55",
        false,
    )
    .await;
    let current_day_entry = insert_seed_entry(
        pool,
        creator_id,
        today,
        0,
        5,
        json!({ "tags": ["boundary"] }),
        1,
        "boundary current day 00:05",
        false,
    )
    .await;
    let next_day_entry = insert_seed_entry(
        pool,
        creator_id,
        tomorrow,
        0,
        5,
        json!({ "tags": ["boundary"] }),
        1,
        "boundary next day 00:05",
        false,
    )
    .await;
    let previous_year_same_day_entry = insert_seed_entry(
        pool,
        creator_id,
        same_day_previous_year,
        0,
        5,
        json!({ "tags": ["boundary"] }),
        1,
        "boundary previous year same month day 00:05",
        false,
    )
    .await;

    let dates_response = build_dates_response(&[
        previous_day_entry.clone(),
        current_day_entry.clone(),
        next_day_entry,
        previous_year_same_day_entry.clone(),
    ]);

    BoundaryFixture {
        email: email.to_string(),
        target_date: format_date(today),
        previous_date: format_date(yesterday),
        on_ids: vec![current_day_entry.id.clone()],
        before_ids: vec![
            current_day_entry.id.clone(),
            previous_day_entry.id.clone(),
            previous_year_same_day_entry.id.clone(),
        ],
        today_ids: vec![current_day_entry.id, previous_year_same_day_entry.id],
        dates_response,
    }
}

/// Extracts ids from entry views to keep list assertions readable.
fn entry_ids(entries: &[EntryView]) -> Vec<String> {
    entries.iter().map(|entry| entry.id.clone()).collect()
}

// ─── AU: authentication ───────────────────────────────────────────────────────

/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/entries")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400(state: &AppState) {
    let req = Request::builder()
        .method("GET")
        .uri("/api/entries")
        .header("onlyquant-token", "not-a-valid-base64-token")
        .body(Body::empty())
        .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── LE: list entries ─────────────────────────────────────────────────────────

/// LE-01: no entries exist for user → 200, empty list.
async fn le_01_empty_list_for_new_user(state: &AppState) {
    let body = list_entries(state, "le01@test.com", "").await;
    assert_eq!(body, ListEntriesResponse {
        entries: vec![],
        has_more: false,
    });
}

/// LE-02: user has entries → 200, entries returned (capped at page size).
async fn le_02_returns_user_entries(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "").await;
    assert_eq!(body.entries.len(), 8);
    assert_eq!(body.has_more, true);
    assert_eq!(entry_ids(&body.entries), seed.page_one_ids);
}

/// LE-03: user A's entries are not visible to user B.
async fn le_03_entries_isolated_per_user(state: &AppState, seed: &SeedFixture) {
    let other_user = list_entries(state, "le03@test.com", "").await;
    assert_eq!(other_user, ListEntriesResponse {
        entries: vec![],
        has_more: false,
    });

    let seeded_user = list_entries(state, &seed.email, "").await;
    assert_eq!(seeded_user.has_more, true);
}

/// LE-04: filter by tag → only entries matching the tag returned.
async fn le_04_filter_by_tag(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "tag=test1").await;
    assert_eq!(entry_ids(&body.entries), seed.tag_test1_ids);
    assert_eq!(body.has_more, false);
}

/// LE-05: filter by contains → only entries whose raw_text includes the substring returned.
async fn le_05_filter_by_contains(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "contains=needle-alpha").await;
    assert_eq!(entry_ids(&body.entries), vec![seed.contains_id.clone()]);
    assert_eq!(body.has_more, false);
}

/// LE-06: filter bookmarked=true → only bookmarked entries returned.
async fn le_06_filter_bookmarked(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "bookmarked=true").await;
    assert_eq!(entry_ids(&body.entries), seed.bookmarked_ids);
    assert_eq!(body.has_more, false);
}

/// LE-07: filter random=true → a random subset of entries returned.
async fn le_07_filter_random(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "random=true").await;
    let returned_ids = entry_ids(&body.entries);
    let unique_ids = returned_ids.iter().cloned().collect::<HashSet<_>>();
    assert_eq!(returned_ids.len(), seed.random_expected_len);
    assert_eq!(unique_ids.len(), seed.random_expected_len);
    assert_eq!(body.has_more, false);
    assert!(unique_ids.iter().all(|id| seed.all_ids.contains(id)));
}

/// LE-08: filter by on (date) → only entries created on that date returned.
async fn le_08_filter_by_on_date(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, &format!("on={}", seed.on_date)).await;
    assert_eq!(entry_ids(&body.entries), seed.on_date_ids);
    assert_eq!(body.has_more, false);
}

/// LE-09: filter by before (date) → only entries created before the next date returned.
async fn le_09_filter_by_before_date(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, &format!("before={}", seed.before_date)).await;
    assert_eq!(entry_ids(&body.entries), seed.before_date_ids);
    assert_eq!(body.has_more, false);
}

/// LE-10: filter today=true → only entries created today returned.
async fn le_10_filter_today(state: &AppState, seed: &SeedFixture) {
    let body = list_entries(state, &seed.email, "today=true").await;
    assert_eq!(entry_ids(&body.entries), seed.today_ids);
    assert_eq!(body.has_more, false);
}

/// LE-11: pagination — page 1 returns items, has_more flag indicates next page availability.
async fn le_11_pagination_page_one(state: &AppState, seed: &SeedFixture) {
    let page_one = list_entries(state, &seed.email, "page=1").await;
    let page_two = list_entries(state, &seed.email, "page=2").await;
    let page_three = list_entries(state, &seed.email, "page=3").await;
    assert_eq!(entry_ids(&page_one.entries), seed.page_one_ids);
    assert_eq!(page_one.has_more, true);
    assert_eq!(page_two.entries.len(), 8);
    assert_eq!(page_two.has_more, true);
    assert_eq!(page_three.entries.len(), (seed.total_entries as usize) - 16);
    assert_eq!(page_three.has_more, false);
}

/// LE-12: filter by on (date) uses Asia/Shanghai local midnight; 00:05 belongs to the new day.
async fn le_12_filter_by_on_date_uses_local_midnight_boundary(
    state: &AppState,
    boundary: &BoundaryFixture,
) {
    let body = list_entries(state, &boundary.email, &format!("on={}", boundary.target_date)).await;
    assert_eq!(entry_ids(&body.entries), boundary.on_ids);
    assert_eq!(body.has_more, false);
}

/// LE-13: filter by before (date) includes the full local day but excludes the next day.
async fn le_13_filter_by_before_date_includes_local_day_boundary(
    state: &AppState,
    boundary: &BoundaryFixture,
) {
    let body =
        list_entries(state, &boundary.email, &format!("before={}", boundary.target_date)).await;
    assert_eq!(entry_ids(&body.entries), boundary.before_ids);
    assert_eq!(body.has_more, false);
}

/// LE-14: filter today=true matches month/day in Asia/Shanghai local time across midnight.
async fn le_14_filter_today_uses_local_month_day_boundary(
    state: &AppState,
    boundary: &BoundaryFixture,
) {
    let body = list_entries(state, &boundary.email, "today=true").await;
    assert_eq!(entry_ids(&body.entries), boundary.today_ids);
    assert_eq!(body.has_more, false);
}

// ─── CE: create entry ────────────────────────────────────────────────────────

/// CE-01: valid payload → 200, response entry matches request fields.
async fn ce_01_valid_payload_returns_entry(state: &AppState) {
    let draft = Uuid::new_v4().to_string();
    let payload = json!({ "tags": ["created"], "location": ["Test", "Zone"] });
    let entry = create_entry(
        state,
        "ce01@test.com",
        Some(&draft),
        payload.clone(),
        4,
        "created entry payload",
    )
    .await;
    assert_eq!(entry.draft, Some(draft));
    assert_eq!(entry.payload, payload);
    assert_eq!(entry.word_count, 4);
    assert_eq!(entry.raw_text, "created entry payload");
    assert_eq!(entry.bookmark, false);
}

/// CE-02: invalid JSON syntax → 400.
async fn ce_02_invalid_json_returns_400(state: &AppState) {
    let req = with_auth(
        Request::builder()
            .method("POST")
            .uri("/api/entries")
            .header("content-type", "application/json"),
        "ce02@test.com",
    )
    .body(Body::from("not json at all"))
    .unwrap();
    let resp = send(state.clone(), req).await;
    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

/// CE-03: created entry appears in subsequent list.
async fn ce_03_created_entry_visible_in_list(state: &AppState) {
    let entry = create_entry(
        state,
        "ce03@test.com",
        None,
        json!({ "tags": ["visible"] }),
        3,
        "visible in list",
    )
    .await;
    let body = list_entries(state, "ce03@test.com", "").await;
    assert_eq!(entry_ids(&body.entries), vec![entry.id]);
}

// ─── GE: get entry ───────────────────────────────────────────────────────────

/// GE-01: existing entry → 200, correct entry returned.
async fn ge_01_existing_id_returns_entry(state: &AppState) {
    let entry = create_entry(
        state,
        "ge01@test.com",
        None,
        json!({ "tags": ["single"] }),
        2,
        "get existing entry",
    )
    .await;
    let resp = get_entry(state, "ge01@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: GetEntryResponse = parse_json(resp).await;
    assert_eq!(body.entry, entry);
}

/// GE-02: non-existent id → 404.
async fn ge_02_missing_id_returns_404(state: &AppState) {
    let resp = get_entry(state, "ge02@test.com", "00000000-0000-0000-0000-000000000000").await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// GE-03: id belonging to another user → 404.
async fn ge_03_other_user_id_returns_404(state: &AppState) {
    let entry = create_entry(
        state,
        "ge03a@test.com",
        None,
        json!({}),
        1,
        "private entry",
    )
    .await;
    let resp = get_entry(state, "ge03b@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── UE: update entry ────────────────────────────────────────────────────────

/// UE-01: valid update payload → 200, response reflects new values.
async fn ue_01_valid_update_returns_updated_entry(state: &AppState) {
    let entry = create_entry(
        state,
        "ue01@test.com",
        None,
        json!({ "tags": ["before"] }),
        2,
        "before update",
    )
    .await;
    let new_draft = Uuid::new_v4().to_string();
    let payload = json!({ "tags": ["after"], "location": ["Updated"] });
    let resp = update_entry(
        state,
        "ue01@test.com",
        &entry.id,
        Some(&new_draft),
        payload.clone(),
        6,
        "after update",
        true,
    )
    .await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: UpdateEntryResponse = parse_json(resp).await;
    assert_eq!(body.entry.draft, Some(new_draft));
    assert_eq!(body.entry.payload, payload);
    assert_eq!(body.entry.word_count, 6);
    assert_eq!(body.entry.raw_text, "after update");
    assert_eq!(body.entry.bookmark, true);
}

/// UE-02: non-existent id → 404.
async fn ue_02_missing_id_returns_404(state: &AppState) {
    let resp = update_entry(
        state,
        "ue02@test.com",
        "00000000-0000-0000-0000-000000000000",
        None,
        json!({}),
        1,
        "missing update",
        false,
    )
    .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// UE-03: id belonging to another user → 404.
async fn ue_03_other_user_id_returns_404(state: &AppState) {
    let entry = create_entry(
        state,
        "ue03a@test.com",
        None,
        json!({}),
        1,
        "owned by another user",
    )
    .await;
    let resp = update_entry(
        state,
        "ue03b@test.com",
        &entry.id,
        None,
        json!({}),
        3,
        "forbidden update",
        false,
    )
    .await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── DE: delete entry ────────────────────────────────────────────────────────

/// DE-01: existing entry → 200, response contains deleted id.
async fn de_01_existing_id_returns_deleted_id(state: &AppState) {
    let entry = create_entry(
        state,
        "de01@test.com",
        None,
        json!({}),
        1,
        "delete me",
    )
    .await;
    let resp = delete_entry(state, "de01@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body: DeleteEntryResponse = parse_json(resp).await;
    assert_eq!(body.id, entry.id);
}

/// DE-02: deleted entry no longer appears in list.
async fn de_02_deleted_entry_absent_from_list(state: &AppState) {
    let entry = create_entry(
        state,
        "de02@test.com",
        None,
        json!({}),
        1,
        "remove from list",
    )
    .await;
    let resp = delete_entry(state, "de02@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let body = list_entries(state, "de02@test.com", "").await;
    assert_eq!(body.entries, vec![]);
}

/// DE-03: deleted entry returns 404 on GET.
async fn de_03_deleted_entry_returns_404_on_get(state: &AppState) {
    let entry = create_entry(
        state,
        "de03@test.com",
        None,
        json!({}),
        1,
        "delete then fetch",
    )
    .await;
    let resp = delete_entry(state, "de03@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let resp = get_entry(state, "de03@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// DE-04: non-existent id → 404.
async fn de_04_missing_id_returns_404(state: &AppState) {
    let resp = delete_entry(state, "de04@test.com", "00000000-0000-0000-0000-000000000000").await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// DE-05: id belonging to another user → 404.
async fn de_05_other_user_id_returns_404(state: &AppState) {
    let entry = create_entry(
        state,
        "de05a@test.com",
        None,
        json!({}),
        1,
        "foreign delete",
    )
    .await;
    let resp = delete_entry(state, "de05b@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── BK: bookmark entry ──────────────────────────────────────────────────────

/// BK-01: existing entry → 200, entry bookmark flag set to true.
async fn bk_01_bookmark_sets_flag_true(state: &AppState) {
    let entry = create_entry(
        state,
        "bk01@test.com",
        None,
        json!({}),
        1,
        "bookmark me",
    )
    .await;
    let resp = bookmark_entry(state, "bk01@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let _: BookmarkEntryResponse = parse_json(resp).await;

    let resp = get_entry(state, "bk01@test.com", &entry.id).await;
    let body: GetEntryResponse = parse_json(resp).await;
    assert_eq!(body.entry.bookmark, true);
}

/// BK-02: bookmarked entry visible when filtering bookmarked=true.
async fn bk_02_bookmarked_entry_in_filter(state: &AppState) {
    let entry = create_entry(
        state,
        "bk02@test.com",
        None,
        json!({}),
        1,
        "bookmark and filter",
    )
    .await;
    let resp = bookmark_entry(state, "bk02@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body = list_entries(state, "bk02@test.com", "bookmarked=true").await;
    assert_eq!(entry_ids(&body.entries), vec![entry.id]);
}

/// BK-03: non-existent id → 404.
async fn bk_03_missing_id_returns_404(state: &AppState) {
    let resp = bookmark_entry(state, "bk03@test.com", "00000000-0000-0000-0000-000000000000").await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// BK-04: id belonging to another user → 404.
async fn bk_04_other_user_id_returns_404(state: &AppState) {
    let entry = create_entry(
        state,
        "bk04a@test.com",
        None,
        json!({}),
        1,
        "foreign bookmark",
    )
    .await;
    let resp = bookmark_entry(state, "bk04b@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── UB: unbookmark entry ────────────────────────────────────────────────────

/// UB-01: bookmarked entry → 200, entry bookmark flag set to false.
async fn ub_01_unbookmark_sets_flag_false(state: &AppState) {
    let entry = create_entry(
        state,
        "ub01@test.com",
        None,
        json!({}),
        1,
        "unbookmark me",
    )
    .await;
    let resp = bookmark_entry(state, "ub01@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let resp = unbookmark_entry(state, "ub01@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let _: UnbookmarkEntryResponse = parse_json(resp).await;

    let resp = get_entry(state, "ub01@test.com", &entry.id).await;
    let body: GetEntryResponse = parse_json(resp).await;
    assert_eq!(body.entry.bookmark, false);
}

/// UB-02: unbookmarked entry excluded when filtering bookmarked=true.
async fn ub_02_unbookmarked_entry_excluded_from_filter(state: &AppState) {
    let entry = create_entry(
        state,
        "ub02@test.com",
        None,
        json!({}),
        1,
        "bookmark then remove",
    )
    .await;
    let resp = bookmark_entry(state, "ub02@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);
    let resp = unbookmark_entry(state, "ub02@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body = list_entries(state, "ub02@test.com", "bookmarked=true").await;
    assert_eq!(body.entries, vec![]);
}

/// UB-03: non-existent id → 404.
async fn ub_03_missing_id_returns_404(state: &AppState) {
    let resp =
        unbookmark_entry(state, "ub03@test.com", "00000000-0000-0000-0000-000000000000").await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

/// UB-04: id belonging to another user → 404.
async fn ub_04_other_user_id_returns_404(state: &AppState) {
    let entry = create_entry(
        state,
        "ub04a@test.com",
        None,
        json!({}),
        1,
        "foreign unbookmark",
    )
    .await;
    let resp = unbookmark_entry(state, "ub04b@test.com", &entry.id).await;
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── SW: stats words ─────────────────────────────────────────────────────────

/// SW-01: user with no entries → 200, word count is 0.
async fn sw_01_no_entries_word_count_zero(state: &AppState) {
    let body = get_words_count(state, "sw01@test.com").await;
    assert_eq!(body.count, 0);
}

/// SW-02: user with entries → 200, word count equals sum of all entry word_counts.
async fn sw_02_word_count_matches_sum(state: &AppState, seed: &SeedFixture) {
    let body = get_words_count(state, &seed.email).await;
    assert_eq!(body.count, seed.total_words);
}

// ─── SC: stats current year ──────────────────────────────────────────────────

/// SC-01: user with no entries this year → 200, padded boundary markers with zero counts.
async fn sc_01_no_entries_this_year_empty(state: &AppState) {
    let body = get_current_year(state, "sc01@test.com").await;
    assert_eq!(body.count, 0);
    assert!(!body.activity.is_empty());
    assert!(body.activity.iter().all(|day| day.count == 0));
}

/// SC-02: user with entries this year → 200, daily counts returned, including the year-start and today.
async fn sc_02_daily_counts_returned(state: &AppState, seed: &SeedFixture) {
    let body = get_current_year(state, &seed.email).await;
    assert_eq!(body.count, seed.current_year_count);
    assert_eq!(
        body.activity.first(),
        Some(&DailyCount {
            date: seed.current_year_first_date.clone(),
            count: body
                .activity
                .first()
                .expect("year-start entry must exist")
                .count,
        })
    );
    assert_eq!(
        body.activity.last(),
        Some(&DailyCount {
            date: seed.current_year_last_date.clone(),
            count: body
                .activity
                .last()
                .expect("today entry must exist")
                .count,
        })
    );
}

/// SC-03: current-year daily counts use Asia/Shanghai local midnight boundaries.
async fn sc_03_daily_counts_use_local_midnight_boundary(
    state: &AppState,
    boundary: &BoundaryFixture,
) {
    let body = get_current_year(state, &boundary.email).await;
    let current_year = OffsetDateTime::now_local()
        .unwrap_or_else(|_| OffsetDateTime::now_utc())
        .year();
    let expected_count = if boundary.previous_date.starts_with(&format!("{current_year}-")) {
        3
    } else {
        2
    };
    assert_eq!(body.count, expected_count);
    assert!(body.activity.iter().any(|day| {
        day.date == boundary.previous_date && day.count == 1
    }));
    assert!(body.activity.iter().any(|day| {
        day.date == boundary.target_date && day.count == 1
    }));
}

// ─── SN: stats count ─────────────────────────────────────────────────────────

/// SN-01: user with no entries → 200, count is 0.
async fn sn_01_no_entries_count_zero(state: &AppState) {
    let body = get_entries_count(state, "sn01@test.com", "").await;
    assert_eq!(body.count, 0);
}

/// SN-02: user with entries → 200, count matches number of entries.
async fn sn_02_count_matches_entries(state: &AppState, seed: &SeedFixture) {
    let body = get_entries_count(state, &seed.email, "").await;
    assert_eq!(body.count, seed.total_entries);
}

// ─── SD: stats dates ─────────────────────────────────────────────────────────

/// SD-01: user with no entries → 200, empty list.
async fn sd_01_no_entries_dates_empty(state: &AppState) {
    let body = get_entry_dates(state, "sd01@test.com").await;
    assert_eq!(body, GetEntryDatesResponse {
        total: 0,
        entry_dates: vec![],
    });
}

/// SD-02: user with entries → 200, distinct date parts returned.
async fn sd_02_dates_returned_for_entries(state: &AppState, seed: &SeedFixture) {
    let body = get_entry_dates(state, &seed.email).await;
    assert_eq!(body, seed.dates_response);
}

/// SD-03: distinct date parts are grouped by Asia/Shanghai local day around midnight boundaries.
async fn sd_03_dates_grouped_by_local_day_boundary(state: &AppState, boundary: &BoundaryFixture) {
    let body = get_entry_dates(state, &boundary.email).await;
    assert_eq!(body, boundary.dates_response);
}

// ─── test runner ──────────────────────────────────────────────────────────────

#[tokio::test]
#[ignore = "requires RUN_TESTCONTAINERS=1"]
async fn entry_handler_tests() {
    let (_container, state, pool) = bootstrap_test_state_with_pool().await;
    let seed = seed_entries(&state, &pool).await;
    let boundary = seed_boundary_entries(&state, &pool).await;

    au_01_no_token_returns_400(&state).await;
    au_02_invalid_token_returns_400(&state).await;
    le_01_empty_list_for_new_user(&state).await;
    le_02_returns_user_entries(&state, &seed).await;
    le_03_entries_isolated_per_user(&state, &seed).await;
    le_04_filter_by_tag(&state, &seed).await;
    le_05_filter_by_contains(&state, &seed).await;
    le_06_filter_bookmarked(&state, &seed).await;
    le_07_filter_random(&state, &seed).await;
    le_08_filter_by_on_date(&state, &seed).await;
    le_09_filter_by_before_date(&state, &seed).await;
    le_10_filter_today(&state, &seed).await;
    le_11_pagination_page_one(&state, &seed).await;
    le_12_filter_by_on_date_uses_local_midnight_boundary(&state, &boundary).await;
    le_13_filter_by_before_date_includes_local_day_boundary(&state, &boundary).await;
    le_14_filter_today_uses_local_month_day_boundary(&state, &boundary).await;
    ce_01_valid_payload_returns_entry(&state).await;
    ce_02_invalid_json_returns_400(&state).await;
    ce_03_created_entry_visible_in_list(&state).await;
    ge_01_existing_id_returns_entry(&state).await;
    ge_02_missing_id_returns_404(&state).await;
    ge_03_other_user_id_returns_404(&state).await;
    ue_01_valid_update_returns_updated_entry(&state).await;
    ue_02_missing_id_returns_404(&state).await;
    ue_03_other_user_id_returns_404(&state).await;
    de_01_existing_id_returns_deleted_id(&state).await;
    de_02_deleted_entry_absent_from_list(&state).await;
    de_03_deleted_entry_returns_404_on_get(&state).await;
    de_04_missing_id_returns_404(&state).await;
    de_05_other_user_id_returns_404(&state).await;
    bk_01_bookmark_sets_flag_true(&state).await;
    bk_02_bookmarked_entry_in_filter(&state).await;
    bk_03_missing_id_returns_404(&state).await;
    bk_04_other_user_id_returns_404(&state).await;
    ub_01_unbookmark_sets_flag_false(&state).await;
    ub_02_unbookmarked_entry_excluded_from_filter(&state).await;
    ub_03_missing_id_returns_404(&state).await;
    ub_04_other_user_id_returns_404(&state).await;
    sw_01_no_entries_word_count_zero(&state).await;
    sw_02_word_count_matches_sum(&state, &seed).await;
    sc_01_no_entries_this_year_empty(&state).await;
    sc_02_daily_counts_returned(&state, &seed).await;
    sc_03_daily_counts_use_local_midnight_boundary(&state, &boundary).await;
    sn_01_no_entries_count_zero(&state).await;
    sn_02_count_matches_entries(&state, &seed).await;
    sd_01_no_entries_dates_empty(&state).await;
    sd_02_dates_returned_for_entries(&state, &seed).await;
    sd_03_dates_grouped_by_local_day_boundary(&state, &boundary).await;
}
