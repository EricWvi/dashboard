# Development Log

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
