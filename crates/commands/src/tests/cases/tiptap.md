# Tiptap command test cases

Methods under test:
- `add_tiptap(content) → Result<String, CommandError>`
- `get_tiptap(id) → Result<Option<TiptapSchemaV1>, CommandError>`
- `list_tiptaps() → Result<Vec<TiptapSchemaV1>, CommandError>`
- `update_tiptap(id, content) → Result<(), CommandError>`
- `delete_tiptap(id) → Result<(), CommandError>`
- `list_tiptap_history(id) → Result<Vec<i64>, CommandError>`
- `get_tiptap_history(id, ts) → Result<Value, CommandError>`
- `restore_tiptap_history(id, ts) → Result<(), CommandError>`

---

## CT — add tiptap

```
/// CT-01: valid content → Ok(id), get_tiptap on the returned id yields a document with
/// matching content and an empty history.
fn ct_01_valid_content_returns_id

/// CT-03: added tiptap is retrievable via get_tiptap immediately after creation.
fn ct_03_added_tiptap_visible_on_get
```

---

## GT — get tiptap

```
/// GT-01: existing id → Ok(Some(tiptap)) with correct content.
fn gt_01_existing_id_returns_tiptap

/// GT-02: non-existent id → Ok(None).
fn gt_02_missing_id_returns_none
```

---

## UT — update tiptap

```
/// UT-01: valid update → Ok(()), get_tiptap reflects the new content.
fn ut_01_valid_update_is_reflected_on_get

/// UT-02: update pushes the previous content into history before overwriting;
/// get_tiptap shows history length == 1 and history[0].content == original content.
fn ut_02_old_content_moved_to_history

/// UT-03: non-existent id → Err(NotFound).
fn ut_03_missing_id_returns_not_found
```

---

## LH — list tiptap history

```
/// LH-01: newly created document with no updates → Ok, empty timestamp list.
fn lh_01_no_history_returns_empty_list

/// LH-02: document updated once → Ok, list contains exactly one timestamp.
fn lh_02_one_update_history_length_one

/// LH-03: document updated twice → Ok, list contains exactly two timestamps.
fn lh_03_two_updates_history_length_two

/// LH-04: document updated multiple times → timestamps returned in descending order (most recent first).
fn lh_04_history_sorted_descending

/// LH-05: non-existent id → Err(NotFound).
fn lh_05_missing_id_returns_not_found
```

---

## RH — restore tiptap history

```
/// RH-01: valid ts → Ok(()), get_tiptap shows content restored to the snapshot at ts.
fn rh_01_valid_ts_restores_content

/// RH-02: non-existent tiptap id → Err(NotFound).
fn rh_02_missing_tiptap_returns_not_found

/// RH-03: ts not present in history → Err(NotFound).
fn rh_03_missing_ts_returns_not_found
```
