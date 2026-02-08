# Development Log

## 2026-02-08: Migrated Flomo to Local-First Sync Design

### Summary

Implemented local-first synchronization architecture for the Flomo feature with three new API endpoints: `FullSync`, `Pull`, and `Push`. Migrated database schema from auto-increment IDs to UUIDs and added server-side versioning for efficient sync.

### Changes Made

#### Database Migration (`migration/migrations.go`)

**Schema Changes:**

- Changed primary keys from `SERIAL` to `UUID` for `d_card`, `d_folder`
- Replaced `created_at`, `updated_at` timestamps with `BIGINT` (Unix milliseconds)
- Added `server_version BIGINT` field to track sync state
- Replaced soft delete `deleted_at` with `is_deleted BOOLEAN`
- Changed foreign keys to UUID: `folder_id`, `parent_id`
- Changed `draft` field from `int` to `UUID` in `d_card`

**New Table:**

- Created `d_tiptap_v2` for Flomo rich text content with:
  - `id` (UUID primary key)
  - `creator_id`, `site` (smallint)
  - `content` (jsonb), `history` (jsonb)
  - `created_at`, `updated_at`, `server_version`, `is_deleted`

**Global Sync Versioning:**

- Created `global_sync_version_seq` sequence shared across all Flomo tables
- Implemented `global_bump_server_version()` trigger function
- Attached triggers to `d_card`, `d_folder`, `d_tiptap_v2` to auto-increment `server_version` on INSERT/UPDATE

#### Models

**Created `model/tiptapv2.go`:**

- `TiptapV2` model with `MetaFieldV2` base
- Methods: `Get()`, `Create()`, `Update()`, `MarkDeleted()`
- Query methods: `ListTiptapV2()`, `ListTiptapV2Since()`, `FullTiptapV2()`
- Site constant: `SiteFlomo = 3`

**Updated `model/card.go`:**

- Changed from `MetaField` to `MetaFieldV2`
- Updated `FolderId` to `*uuid.UUID` (nullable)
- Updated `Draft` from `int` to `uuid.UUID`
- Added `ListCardsSince()` for incremental sync (filters by `server_version > since`)
- Added `FullCards()` for full sync (filters by `is_deleted = false`)
- Added `MarkDeleted()` for soft delete

**Updated `model/folder.go`:**

- Changed from `MetaField` to `MetaFieldV2`
- Updated `ParentId` to `*uuid.UUID` (nullable)
- Added `ListFoldersSince()` for incremental sync
- Added `FullFolders()` for full sync
- Added `MarkDeleted()` for soft delete

**Updated `model/model.go`:**

- Added `MetaFieldV2` struct with UUID primary key and sync fields:
  - `Id uuid.UUID`, `CreatedAt int64`, `UpdatedAt int64`
  - `ServerVersion int64`, `IsDeleted bool`, `CreatorId uint`
- Added site constants: `SiteDashboard = 1`, `SiteJournal = 2`, `SiteFlomo = 3`
- Added field constants: `ServerVersion`, `IsDeleted`

#### Handlers (`handler/flomo/`)

**Created `base.go`:**

- Base handler structure with `DefaultHandler` dispatcher

**Created `full.go` - Full Sync Endpoint:**

- Action: `FullSync`
- Returns all non-deleted cards, folders, and tiptap documents
- Used for initial sync or complete refresh
- Response includes arrays of `Card`, `Folder`, `TiptapV2`

**Created `pull.go` - Incremental Pull Endpoint:**

- Action: `Pull`
- Parameter: `since int64` (server version timestamp)
- Returns all cards, folders, and tiptaps with `server_version > since`
- Includes deleted items (for local cleanup)
- Efficient incremental sync from server to client

**Created `push.go` - Client Push Endpoint:**

- Action: `Push`
- Accepts arrays of cards, folders, and tiptaps from client
- For each item: checks if exists (by UUID), creates or updates accordingly
- Automatically sets `creator_id` and `site` fields
- Returns success status

**Updated all card handlers:**

- Changed ID types from `uint` to `uuid.UUID` in:
  - `CreateCard`, `CreateFolder`, `DeleteCard`, `DeleteFolder`
  - `GetCard`, `GetFolder`, `UpdateCard`, `UpdateFolder`
  - `ListCards` (FolderId), `ListFolders` (ParentId)

### Architecture Decisions

**Local-First Sync Strategy:**

- Client generates UUIDs for new items (no server round-trip needed)
- `server_version` acts as a logical clock for ordering changes
- Soft delete with `is_deleted` flag allows sync of deletions
- Pull-based sync: client tracks last `server_version` and pulls changes
- Push-based updates: client pushes local changes, server upserts

**Three-Endpoint Sync Model:**

1. **FullSync**: Initial load or recovery from conflict/lost state
2. **Pull**: Regular incremental updates from server
3. **Push**: Send local changes to server

**Global Version Sequence:**

- All Flomo tables (`d_card`, `d_folder`, `d_tiptap_v2`) share one sequence
- Ensures total ordering of all changes across tables
- Database triggers automatically bump version on every write
- Enables efficient "give me everything since version N" queries

## 2026-02-08: Implemented Flomo Card and Folder System

### Summary

Successfully implemented the Flomo card note-taking feature with complete CRUD operations for both Cards and Folders.

### Changes Made

#### Models (`model/`)

- **Created `card.go`**: Defined `Card` and `CardField` structs with support for:
  - Title, folder_id, draft status, payload (JSONB), raw_text, review_count
  - Full CRUD operations: Create, Get, List, Update, Delete
  - Proper table mapping to `d_card`

- **Created `folder.go`**: Defined `Folder` and `FolderField` structs with support for:
  - Title, parent_id, payload (JSONB)
  - Full CRUD operations: Create, Get, List, Update, Delete
  - Proper table mapping to `d_folder`

#### Handlers (`handler/card/`)

- **Created `base.go`**: Base handler structure with `DefaultHandler` dispatcher

**Folder Operations:**

- **CreateFolder**: Creates a new folder with required title and optional parentId
- **GetFolder**: Retrieves a specific folder by ID
- **ListFolders**: Lists all folders under a specific parent_id
- **UpdateFolder**: Updates folder fields (title, parent_id, payload)
- **DeleteFolder**: Soft deletes a folder

**Card Operations:**

- **CreateCard**: Creates a new card with required title and optional folderId
- **GetCard**: Retrieves a specific card by ID
- **ListCards**: Lists all cards in a specific folder
- **UpdateCard**: Updates card fields (excluding review_count which is protected)
- **DeleteCard**: Soft deletes a card

#### Router (`router.go`)

- Added import for `handler/card` package
- Registered `/card` endpoints for both GET and POST methods

### Architecture Decisions

- Followed existing bookmark handler patterns for consistency
- Used `WhereMap` for database queries with creator_id validation
- Implemented soft deletes using GORM's `DeletedAt` field
- Protected `review_count` field from direct updates (similar to bookmark's `click` field)
- All handlers validate user ownership via `middleware.GetUserId(c)`
