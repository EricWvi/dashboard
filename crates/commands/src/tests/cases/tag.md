# Tag command test cases

Methods under test:
- `add_tag(name) → Result<String, CommandError>`
- `list_tags() → Result<Vec<TagSchemaV1>, CommandError>`
- `get_tag(id) → Result<Option<TagSchemaV1>, CommandError>`
- `rename_tag(id, name) → Result<(), CommandError>`
- `delete_tag(id) → Result<(), CommandError>`

---

## LT — list tags

```
/// LT-01: no tags exist → Ok, empty list.
fn lt_01_empty_list_when_no_tags

/// LT-02: tags exist → Ok, all non-deleted tags returned.
fn lt_02_returns_all_non_deleted_tags

/// LT-04: soft-deleted tags are excluded from the result list.
fn lt_04_deleted_tags_excluded

/// LT-06: results are ordered by created_at ascending.
fn lt_06_results_ordered_by_created_at_asc
```

---

## CT — add tag

```
/// CT-01: add_tag with a valid name → Ok(id), tag is retrievable by that id.
fn ct_01_add_tag_returns_id

/// CT-02: two consecutive add_tag calls → both tags appear in list_tags.
fn ct_02_multiple_add_tag_calls_all_visible

/// CT-03: added tag appears in subsequent list_tags result.
fn ct_03_added_tag_visible_in_list
```

---

## DT — delete tag

```
/// DT-01: existing tag id → Ok(()), tag is soft-deleted.
fn dt_01_existing_id_deletes_tag

/// DT-02: deleted tag is absent from subsequent list_tags.
fn dt_02_deleted_tag_absent_from_list

/// DT-03: non-existent id → Err(NotFound).
fn dt_03_missing_id_returns_not_found
```
