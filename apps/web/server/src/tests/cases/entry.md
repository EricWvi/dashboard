# Entry handler test cases

Routes under test:
- `GET    /api/entries`
- `POST   /api/entries`
- `GET    /api/entries/{id}`
- `PUT    /api/entries/{id}`
- `DELETE /api/entries/{id}`
- `POST   /api/entries/{id}/bookmark`
- `POST   /api/entries/{id}/unbookmark`
- `GET    /api/entries/stats/words`
- `GET    /api/entries/stats/current-year`
- `GET    /api/entries/stats/count`
- `GET    /api/entries/stats/dates`

---

## AU — authentication (cross-cutting)

```
/// AU-01: request with no token → 400.
async fn au_01_no_token_returns_400

/// AU-02: request with a corrupted token → 400.
async fn au_02_invalid_token_returns_400
```

---

## LE — list entries  `GET /api/entries`

```
/// LE-01: no entries exist for user → 200, empty list.
async fn le_01_empty_list_for_new_user

/// LE-02: user has entries → 200, entries returned (capped at page size).
async fn le_02_returns_user_entries

/// LE-03: user A's entries are not visible to user B.
async fn le_03_entries_isolated_per_user

/// LE-04: filter by tag → only entries matching the tag returned.
async fn le_04_filter_by_tag

/// LE-05: filter by contains → only entries whose raw_text includes the substring returned.
async fn le_05_filter_by_contains

/// LE-06: filter bookmarked=true → only bookmarked entries returned.
async fn le_06_filter_bookmarked

/// LE-07: filter random=true → a random subset of entries returned.
async fn le_07_filter_random

/// LE-08: filter by on (date) → only entries created on that date returned.
async fn le_08_filter_by_on_date

/// LE-09: filter by before (date) → only entries created before the next date returned.
async fn le_09_filter_by_before_date

/// LE-10: filter today=true → only entries created today returned.
async fn le_10_filter_today

/// LE-11: pagination — page 1 returns items, has_more flag indicates next page availability.
async fn le_11_pagination_page_one

/// LE-12: filter by on (date) uses Asia/Shanghai local midnight; 00:05 belongs to the new day,
/// while 23:55 on the previous day is excluded.
async fn le_12_filter_by_on_date_uses_local_midnight_boundary

/// LE-13: filter by before (date) includes the full local day; 00:05 on that day is included,
/// while 00:05 on the next day is excluded.
async fn le_13_filter_by_before_date_includes_local_day_boundary

/// LE-14: filter today=true matches month/day in Asia/Shanghai local time across midnight.
async fn le_14_filter_today_uses_local_month_day_boundary

/// LE-15: filter by location=A returns all entries whose location starts with "A":
/// ["A"], ["A","B B"], ["A","B B","C"], ["A","B B","D"] are included; ["B B"] and [] are excluded.
async fn le_15_filter_by_location_single_component

/// LE-16: filter by location=A,B%20B returns entries whose location starts with ["A","B B"]:
/// ["A","B B"], ["A","B B","C"], ["A","B B","D"] are included; ["A"] and ["A","C"] are excluded.
/// Space in "B B" is percent-encoded as %20 in the query string.
async fn le_16_filter_by_location_two_components

/// LE-17: filter by location=A,B%20B,C returns only entries starting with ["A","B B","C"]:
/// ["A","B B","C"] is included; ["A","B B"], ["A","B B","D"] are excluded.
/// Space in "B B" is percent-encoded as %20 in the query string.
async fn le_17_filter_by_location_three_components
```

---

## CE — create entry  `POST /api/entries`

```
/// CE-01: valid payload → 200, response entry matches request fields.
async fn ce_01_valid_payload_returns_entry

/// CE-02: invalid JSON syntax → 400.
async fn ce_02_invalid_json_returns_400

/// CE-03: created entry appears in subsequent list.
async fn ce_03_created_entry_visible_in_list
```

---

## GE — get entry  `GET /api/entries/{id}`

```
/// GE-01: existing entry → 200, correct entry returned.
async fn ge_01_existing_id_returns_entry

/// GE-02: non-existent id → 404.
async fn ge_02_missing_id_returns_404

/// GE-03: id belonging to another user → 404.
async fn ge_03_other_user_id_returns_404
```

---

## UE — update entry  `PUT /api/entries/{id}`

```
/// UE-01: valid update payload → 200, response reflects new values.
async fn ue_01_valid_update_returns_updated_entry

/// UE-02: non-existent id → 404.
async fn ue_02_missing_id_returns_404

/// UE-03: id belonging to another user → 404.
async fn ue_03_other_user_id_returns_404
```

---

## DE — delete entry  `DELETE /api/entries/{id}`

```
/// DE-01: existing entry → 200, response contains deleted id.
async fn de_01_existing_id_returns_deleted_id

/// DE-02: deleted entry no longer appears in list.
async fn de_02_deleted_entry_absent_from_list

/// DE-03: deleted entry returns 404 on GET.
async fn de_03_deleted_entry_returns_404_on_get

/// DE-04: non-existent id → 404.
async fn de_04_missing_id_returns_404

/// DE-05: id belonging to another user → 404.
async fn de_05_other_user_id_returns_404
```

---

## BK — bookmark entry  `POST /api/entries/{id}/bookmark`

```
/// BK-01: existing entry → 200, entry bookmark flag set to true.
async fn bk_01_bookmark_sets_flag_true

/// BK-02: bookmarked entry visible when filtering bookmarked=true.
async fn bk_02_bookmarked_entry_in_filter

/// BK-03: non-existent id → 404.
async fn bk_03_missing_id_returns_404

/// BK-04: id belonging to another user → 404.
async fn bk_04_other_user_id_returns_404
```

---

## UB — unbookmark entry  `POST /api/entries/{id}/unbookmark`

```
/// UB-01: bookmarked entry → 200, entry bookmark flag set to false.
async fn ub_01_unbookmark_sets_flag_false

/// UB-02: unbookmarked entry excluded when filtering bookmarked=true.
async fn ub_02_unbookmarked_entry_excluded_from_filter

/// UB-03: non-existent id → 404.
async fn ub_03_missing_id_returns_404

/// UB-04: id belonging to another user → 404.
async fn ub_04_other_user_id_returns_404
```

---

## SW — stats: word count  `GET /api/entries/stats/words`

```
/// SW-01: user with no entries → 200, word count is 0.
async fn sw_01_no_entries_word_count_zero

/// SW-02: user with entries → 200, word count equals sum of all entry word_counts.
async fn sw_02_word_count_matches_sum
```

---

## SC — stats: current year  `GET /api/entries/stats/current-year`

```
/// SC-01: user with no entries this year → 200, empty list.
async fn sc_01_no_entries_this_year_empty

/// SC-02: user with entries this year → 200, daily counts returned, including the year-start and today
async fn sc_02_daily_counts_returned

/// SC-03: current-year daily counts use Asia/Shanghai local midnight boundaries; 23:55 remains on
/// the previous day and 00:05 counts toward the new day.
async fn sc_03_daily_counts_use_local_midnight_boundary
```

---

## SN — stats: entry count  `GET /api/entries/stats/count`

```
/// SN-01: user with no entries → 200, count is 0.
async fn sn_01_no_entries_count_zero

/// SN-02: user with entries → 200, count matches number of entries.
async fn sn_02_count_matches_entries
```

---

## SD — stats: entry dates  `GET /api/entries/stats/dates`

```
/// SD-01: user with no entries → 200, empty list.
async fn sd_01_no_entries_dates_empty

/// SD-02: user with entries → 200, distinct date parts returned.
async fn sd_02_dates_returned_for_entries

/// SD-03: distinct date parts are grouped by Asia/Shanghai local day around midnight boundaries.
async fn sd_03_dates_grouped_by_local_day_boundary
```
