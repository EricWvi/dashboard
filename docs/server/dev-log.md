# Development Log

## 2026-02-23: v2.9.0 Migration - Pointer Types for Boolean Fields

### Changes:
1. **Updated `MetaFieldV2` in `model/model.go`**: Changed `IsDeleted` from `bool` to `*bool`
   - Reason: GORM ignores zero values (`false`) when updating, preventing proper soft-deletes

2. **Added `is_bookmarked` and `is_archived` fields to Card model** (`model/card.go`):
   - Added `IsBookmarked *bool` field with column mapping
   - Added `IsArchived *bool` field with column mapping
   - Added constants `Card_IsBookmarked` and `Card_IsArchived`

3. **Added `is_bookmarked` and `is_archived` fields to Folder model** (`model/folder.go`):
   - Added `IsBookmarked *bool` field with column mapping
   - Added `IsArchived *bool` field with column mapping
   - Added constants `Folder_IsBookmarked` and `Folder_IsArchived`

4. **Added helper function `BoolPtr`** in `model/model.go`:
   - Utility to create boolean pointers from bool values

5. **Updated all `IsDeleted` usages** in `card.go`, `folder.go`, and `tiptapv2.go`:
   - `FullCards`, `FullFolders`, `FullTiptapV2`: Use `BoolPtr(false)` for filtering
   - `MarkDeleted` methods: Use `BoolPtr(true)` for deletion

### Why Pointer Types for Booleans?
GORM treats zero values (like `false` for booleans) as "not set" during updates. This means setting a boolean to `false` would be ignored. Using pointer types (`*bool`) allows:
- `nil` = field not included in update
- `&false` = explicitly set to false
- `&true` = explicitly set to true

### Migration Notes:
- Database migration `v2.9.0` already exists in `migration/migrations.go`
- Adds `is_bookmarked` and `is_archived` columns to `d_card` and `d_folder` tables
- Default value is `FALSE` in database
