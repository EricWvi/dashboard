# Flomo Development Log

## 2026-02-10: Local-First Architecture Implementation

### Overview

Implemented complete local-first synchronization architecture for Flomo using Dexie (IndexedDB) with room for future Tauri/SQLite support.

### Changes

#### 1. Database Layer (`client/src/lib/flomo-db.ts`)

- Created Dexie database schema with tables for:
  - `cards`: Card storage with indexes on serverVersion, syncStatus, folderId, updatedAt
  - `folders`: Folder organization with indexes on serverVersion, syncStatus, parentId, updatedAt
  - `tiptaps`: TipTap editor documents with indexes on serverVersion, syncStatus, updatedAt
  - `syncMeta`: Metadata for sync state (lastServerVersion, lastSyncTime)

- Defined TypeScript interfaces matching server schema (omitting `creator_id`, `review_count`, `site` per requirements)

- Added `syncStatus` field to track local changes:
  - `"synced"`: In sync with server
  - `"pending"`: Local changes not yet pushed
  - `"deleted"`: Marked for deletion (soft delete)

- Implemented `IFlomoDatabase` interface for database abstraction:
  - Card operations: get, getAll, getCardsInFolder, put, putCards, delete
  - Folder operations: get, getAll, getFoldersInParent, put, putFolders, delete
  - TipTap operations: get, put, putTiptaps
  - Sync operations: getPendingChanges, getSyncMeta, setSyncMeta, getLastServerVersion, clearAllData

- Created `DexieFlomoDatabase` class implementing the interface for web
- Future Tauri support can implement same interface with SQLite backend

#### 2. Sync Manager (`client/src/lib/sync-manager.ts`)

- Implemented `SyncManager` class decoupled from database implementation
- Takes `IFlomoDatabase` interface in constructor for flexibility

**Key Methods:**

- `fullSync()`: Initial sync that downloads all data from server
  - Calls `/api/flomo?Action=FullSync`
  - Clears local database
  - Bulk inserts all cards, folders, and tiptaps
  - Updates lastServerVersion metadata

- `pushChanges()`: Upload local changes to server
  - Finds records with `syncStatus: "pending"` or `"deleted"`
  - Sends to `/api/flomo?Action=Push`
  - Marks as synced or deletes locally on success

- `pullChanges()`: Download incremental updates from server
  - Calls `/api/flomo?Action=Pull&since={lastServerVersion}`
  - Uses Last-Write-Wins (LWW) conflict resolution
  - Compares `updatedAt` timestamps and `serverVersion`
  - Only applies changes if remote is newer

- `sync()`: Bidirectional sync (push then pull)
  - Non-blocking: returns immediately if already syncing
  - Updates sync progress for UI feedback

- `startAutoSync(intervalMs)`: Automatic background sync
  - Default 30-second interval
  - Runs sync without blocking UI

- Progress tracking with subscribe/unsubscribe pattern for UI updates

#### 3. React Hooks (`client/src/hooks/`)

**`use-cards.ts`:**

- `useCards()`: Fetch all cards from local database
- `useCardsInFolder(folderId)`: Fetch cards in specific folder
- `useCard(id)`: Fetch single card
- `useCreateCard()`: Create new card with UUID, marks as pending
- `useUpdateCard()`: Update card, marks as pending
- `useDeleteCard()`: Soft delete (sets isDeleted=true, syncStatus="deleted")

**`use-folders.ts`:**

- `useFolders()`: Fetch all folders from local database
- `useFoldersInParent(parentId)`: Fetch folders under parent
- `useFolder(id)`: Fetch single folder
- `useCreateFolder()`: Create new folder with UUID, marks as pending
- `useUpdateFolder()`: Update folder, marks as pending
- `useDeleteFolder()`: Soft delete

All hooks use TanStack Query for caching and invalidation

#### 4. Flomo Page Updates (`client/src/pages/Flomo.tsx`)

- Shows loading screen with FlomoLogo during initial full sync
- Creates singleton `SyncManager` instance
- Subscribes to sync progress for UI feedback
- Performs `fullSync()` on mount
- Starts auto-sync (30s interval) after initial sync completes
- Displays sync status indicator:
  - Green dot: idle/synced
  - Blue dot: syncing/pushing/pulling
  - Red dot: error
- Shows last sync time when idle
- Displays basic list of folders and cards (temporary UI)

#### 5. Dependencies Added

- `dexie`: IndexedDB wrapper for web
- `uuid`: UUID generation for client-side IDs
- `@types/uuid`: TypeScript types for uuid

### Architecture Decisions

1. **Decoupled Database Layer**: `IFlomoDatabase` interface allows future Tauri/SQLite implementation without changing sync logic

2. **Client-Generated UUIDs**: All IDs generated client-side using uuid v4, eliminating need for server ID allocation

3. **Last-Write-Wins (LWW)**: Conflict resolution based on `updatedAt` timestamp and `serverVersion` as tiebreaker

4. **Soft Deletes**: Records marked with `isDeleted=true` instead of hard deletion, synced to server for multi-device consistency

5. **Non-Blocking Sync**: Background sync runs in setInterval without blocking UI or initial page load (after first full sync)

6. **Optimistic Updates**: Local changes immediately reflected in UI, synced in background

### Testing

- Dev server starts successfully: `npm run dev:flomo`
- No TypeScript compilation errors
- All files type-checked successfully

### Next Steps

- Build actual UI components for card/folder management
- Implement TipTap editor integration
- Add error handling and retry logic for failed syncs
- Implement search functionality on local data
- Add offline indicator
- Consider implementing conflict resolution UI for edge cases
