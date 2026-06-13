# Entry command test cases

Methods under test:
- `add_entry(draft, payload, word_count, raw_text) → Result<String, CommandError>`
- `get_entry(id) → Result<Option<EntrySchemaV1>, CommandError>`
- `list_entries(random, filter, page) → Result<(Vec<EntrySchemaV1>, bool), CommandError>`
- `search_entries(query, filter) → Result<Vec<EntrySchemaV1>, CommandError>`
- `update_entry(id, draft, payload, word_count, raw_text) → Result<(), CommandError>`
- `delete_entry(id) → Result<(), CommandError>`
- `bookmark_entry(id) → Result<(), CommandError>`
- `unbookmark_entry(id) → Result<(), CommandError>`
- `count_words() → Result<i64, CommandError>`
- `count_entries() → Result<i64, CommandError>`
- `count_entries_by_year(year) → Result<i64, CommandError>`
- `get_current_year() → Result<(Vec<DailyCount>, i32), CommandError>`
- `get_entry_dates() → Result<(Vec<EntryYearEntry>, i32), CommandError>`

Page size is 8 entries per page.

---

## LE — list entries

```
/// LE-01: no entries exist → Ok([], false).
fn le_01_empty_list_when_no_entries

/// LE-02: entries exist → Ok, first page returned ordered by created_at descending.
fn le_02_returns_first_page_of_entries

/// LE-04: filter by tag → only entries whose payload contains the tag returned.
fn le_04_filter_by_tag

/// LE-05: search_entries with a query → only entries whose raw_text matches returned.
fn le_05_search_by_raw_text

/// LE-06: filter bookmarked=true → only bookmarked entries returned.
fn le_06_filter_bookmarked

/// LE-08: filter by on (date) → only entries created on that date returned.
fn le_08_filter_by_on_date

/// LE-09: filter by before (date) → only entries created on or before that date returned.
fn le_09_filter_by_before_date

/// LE-10: filter today=true → only entries created today returned.
fn le_10_filter_today

/// LE-11: pagination — page 1 returns up to 8 entries with has_more=true when total > 8;
/// page 2 returns the next batch; the last page has has_more=false.
fn le_11_pagination

/// LE-12: filter by on (date) uses local midnight boundary; 00:05 belongs to the new day,
/// while 23:55 on the previous day is excluded.
fn le_12_filter_by_on_date_uses_local_midnight_boundary

/// LE-13: filter by before (date) includes the full local day; 00:05 on that day is included,
/// while 00:05 on the next day is excluded.
fn le_13_filter_by_before_date_includes_local_day_boundary

/// LE-14: filter today=true matches month/day in local time across midnight.
fn le_14_filter_today_uses_local_month_day_boundary

/// LE-15: filter by location=["A"] returns all entries whose location starts with "A":
/// ["A"], ["A","B B"], ["A","B B","C"], ["A","B B","D"] are included; ["B B"] and [] are excluded.
fn le_15_filter_by_location_single_component

/// LE-16: filter by location=["A","B B"] returns entries whose location starts with ["A","B B"]:
/// ["A","B B"], ["A","B B","C"], ["A","B B","D"] are included; ["A"] and ["A","C"] are excluded.
fn le_16_filter_by_location_two_components

/// LE-17: filter by location=["A","B B","C"] returns only entries starting with ["A","B B","C"]:
/// ["A","B B","C"] is included; ["A","B B"], ["A","B B","D"] are excluded.
fn le_17_filter_by_location_three_components

/// LE-18: list_entries with tag + location + bookmarked + on all set → only the single entry
/// satisfying every dimension is returned.
/// Setup — 6 entries (base_ts offsets 5000..0), each failing exactly one filter:
///   e1: tag=rust, location=["Home"], bookmarked=true,  on=today     → MATCH
///   e2: tag=go,   location=["Home"], bookmarked=true,  on=today     → wrong tag
///   e3: tag=rust, location=["Work"], bookmarked=true,  on=today     → wrong location
///   e4: tag=rust, location=["Home"], bookmarked=false, on=today     → not bookmarked
///   e5: tag=rust, location=["Home"], bookmarked=true,  on=yesterday → wrong date
///   e6: tag=rust, location=["Home"], bookmarked=true,  on=today     (no raw_text match needed)
/// Filter: tag="rust", location=["Home"], bookmarked=true, on=today.
/// Expected: entries == [e1].
fn le_18_combined_filter_list_tag_location_bookmarked_on

/// LE-19: search_entries with query + tag + location + bookmarked + on all set → only the
/// single entry satisfying all five conditions is returned.
/// Setup — 6 entries (base_ts offsets 5000..0), each failing exactly one condition:
///   e1: raw_text="horizon rust home",  tag=rust, location=["Home"], bookmarked=true,  on=today     → MATCH
///   e2: raw_text="zenith rust home",   tag=rust, location=["Home"], bookmarked=true,  on=today     → query miss
///   e3: raw_text="horizon go home",    tag=go,   location=["Home"], bookmarked=true,  on=today     → wrong tag
///   e4: raw_text="horizon rust work",  tag=rust, location=["Work"], bookmarked=true,  on=today     → wrong location
///   e5: raw_text="horizon rust home",  tag=rust, location=["Home"], bookmarked=false, on=today     → not bookmarked
///   e6: raw_text="horizon rust home",  tag=rust, location=["Home"], bookmarked=true,  on=yesterday → wrong date
/// Filter: query="horizon", tag="rust", location=["Home"], bookmarked=true, on=today.
/// Expected: results == [e1].
fn le_19_combined_filter_search_query_tag_location_bookmarked_on

/// LE-20: search_entries with mixed CJK and Latin queries on a single seeded entry.
/// raw_text: "我是陈冠希呀，我现在在LA啊，我遇到一些很坏很坏的人，一些gangster，
///  you know？现在我需要你的帮助，微信转账300块，帮我回到香港，你懂我意思吗，我对你敬礼啊，Salute"
/// Alongside an unrelated "nothing here" entry, each of these queries must return
/// exactly the target entry:
///   "香"      — single CJK character
///   "香港"    — two CJK characters
///   "陈冠希"  — three-character name
///   "微信转账" — four-character phrase
///   "LA"      — Latin abbreviation
///   "you know" — multi-word Latin phrase
fn le_20_search_mixed_cjk_and_latin_queries
```

---

## CE — add entry

```
/// CE-01: valid inputs → Ok(id), get_entry on the returned id yields an entry matching
/// the provided draft, payload, word_count, and raw_text; bookmark is false.
fn ce_01_valid_inputs_returns_id

/// CE-03: added entry appears in subsequent list_entries result.
fn ce_03_added_entry_visible_in_list
```

---

## GE — get entry

```
/// GE-01: existing id → Ok(Some(entry)) with correct fields.
fn ge_01_existing_id_returns_entry

/// GE-02: non-existent id → Ok(None).
fn ge_02_missing_id_returns_none
```

---

## UE — update entry

```
/// UE-01: valid update → Ok(()), subsequent get_entry reflects new draft, payload,
/// word_count, and raw_text.
fn ue_01_valid_update_is_reflected_on_get

/// UE-02: non-existent id → Err(NotFound).
fn ue_02_missing_id_returns_not_found
```

---

## DE — delete entry

```
/// DE-01: existing entry → Ok(()), entry is soft-deleted.
fn de_01_existing_id_deletes_entry

/// DE-02: deleted entry is absent from subsequent list_entries.
fn de_02_deleted_entry_absent_from_list

/// DE-03: deleted entry returns None on get_entry.
fn de_03_deleted_entry_returns_none_on_get

/// DE-04: non-existent id → Err(NotFound).
fn de_04_missing_id_returns_not_found
```

---

## BK — bookmark entry

```
/// BK-01: existing entry → Ok(()), get_entry shows bookmark = true.
fn bk_01_bookmark_sets_flag_true

/// BK-02: bookmarked entry is returned when filtering bookmarked=true.
fn bk_02_bookmarked_entry_in_filter

/// BK-03: non-existent id → Err(NotFound).
fn bk_03_missing_id_returns_not_found
```

---

## UB — unbookmark entry

```
/// UB-01: bookmarked entry → Ok(()), get_entry shows bookmark = false.
fn ub_01_unbookmark_sets_flag_false

/// UB-02: unbookmarked entry is excluded when filtering bookmarked=true.
fn ub_02_unbookmarked_entry_excluded_from_filter

/// UB-03: non-existent id → Err(NotFound).
fn ub_03_missing_id_returns_not_found
```

---

## SW — stats: word count

```
/// SW-01: no entries → count_words returns 0.
fn sw_01_no_entries_word_count_zero

/// SW-02: entries exist → count_words returns the sum of all entry word_counts.
fn sw_02_word_count_matches_sum
```

---

## SC — stats: current year

```
/// SC-01: no entries this year → get_current_year returns total=0, activity is non-empty
/// (padded with year-start and today at count=0), all counts are 0.
fn sc_01_no_entries_this_year_activity_padded

/// SC-02: entries this year → total equals the count of entries this year; activity includes
/// the year-start entry and today's entry.
fn sc_02_daily_counts_returned

/// SC-03: daily counts use local midnight boundaries; 23:55 is attributed to the previous day
/// and 00:05 counts toward the new day.
fn sc_03_daily_counts_use_local_midnight_boundary
```

---

## SN — stats: entry count

```
/// SN-01: no entries → count_entries returns 0.
fn sn_01_no_entries_count_zero

/// SN-02: entries exist → count_entries returns the total number of non-deleted entries.
fn sn_02_count_matches_entries

/// SN-03: count_entries_by_year returns only entries created in the given year.
fn sn_03_count_by_year_scoped_to_year
```

---

## SD — stats: entry dates

```
/// SD-01: no entries → get_entry_dates returns ([], 0).
fn sd_01_no_entries_dates_empty

/// SD-02: entries exist → get_entry_dates returns the distinct dates grouped by
/// year → month → days, all ordered descending, total equals distinct date count.
fn sd_02_dates_returned_for_entries

/// SD-03: distinct dates are grouped by local midnight boundaries; 23:55 and 00:05
/// on the next day belong to different local days.
fn sd_03_dates_grouped_by_local_day_boundary
```
