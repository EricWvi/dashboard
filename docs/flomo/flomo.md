## Flomo

Flomo is a card-based note-taking system with folder organization and **local-first architecture** for offline support and instant responsiveness.

### Architecture

Flomo implements a local-first design using:

- **Dexie (IndexedDB)** for client-side storage in web browsers
- **Decoupled database interface** for future Tauri/SQLite support
- **Bidirectional synchronization** with automatic conflict resolution
- **Optimistic updates** for instant UI feedback

#### Data Flow

1. **User Actions** → Immediate local database update with `syncStatus: "pending"`
2. **UI Updates** → Read from local database (instant, no network delay)
3. **Background Sync** → Push/Pull every 30 seconds without blocking UI
4. **Conflict Resolution** → Last-Write-Wins based on `updatedAt` timestamp

### Structure

```
src                                 # Source code directory
├── components
│   ├── flomo
│   ├── tiptap-*                    # Shared Tiptap editor code
│   └── ui                          # Shared UI components
├── hooks
│   ├── use-cards.ts                # Card operations (local-first)
│   └── use-folders.ts              # Folder operations (local-first)
├── lib
│   ├── flomo-db.ts                 # Dexie database layer + abstraction interface
│   └── sync-manager.ts             # Synchronization logic (push/pull/fullSync)
├── pages
│   └── Flomo.tsx                   # Main page with sync initialization
├── flomo-main.tsx                  # Flomo app entry point
├── FlomoApp.tsx                    # Main app component
└── index.css                       # Global styles and Tailwind directives (shared with Dashboard)
```

### Database Schema

**Cards Table:**

- `id` (UUID, primary key)
- `folderId` (UUID, nullable)
- `title`, `rawText`, `draft` (UUID), `payload` (JSON)
- `createdAt`, `updatedAt`, `serverVersion`
- `isDeleted` (boolean, soft delete)
- `syncStatus` ("synced" | "pending" | "deleted")

**Folders Table:**

- `id` (UUID, primary key)
- `parentId` (UUID, nullable)
- `title`, `payload` (JSON)
- `createdAt`, `updatedAt`, `serverVersion`
- `isDeleted` (boolean, soft delete)
- `syncStatus` ("synced" | "pending" | "deleted")

**TipTaps Table:**

- `id` (UUID, primary key)
- `content` (JSON), `history` (JSON array)
- `createdAt`, `updatedAt`, `serverVersion`
- `isDeleted` (boolean, soft delete)
- `syncStatus` ("synced" | "pending" | "deleted")

**SyncMeta Table:**

- `key` (string, primary key)
- `value` (number | string)
- Used for: `lastServerVersion`, `lastSyncTime`

### Sync Manager API

```typescript
const syncManager = new SyncManager(flomoDatabase);

// Initial sync (called on app load)
await syncManager.fullSync();

// Start background sync (30s default)
syncManager.startAutoSync(30000);

// Manual sync (push + pull)
await syncManager.sync();

// Subscribe to progress
const unsubscribe = syncManager.subscribe((progress) => {
  console.log(progress.status); // "idle" | "syncing" | "full-sync" | "push" | "pull" | "error"
});
```

### Key Design Decisions

1. **UUID Generation**: All IDs generated client-side using uuid v4
2. **Soft Deletes**: Records marked `isDeleted=true` and synced (not hard deleted)
3. **LWW Conflict Resolution**: `updatedAt` timestamp with `serverVersion` tiebreaker
4. **Non-Blocking Sync**: Initial full sync blocks UI, but subsequent syncs run in background
5. **Database Abstraction**: `IFlomoDatabase` interface allows swapping Dexie for SQLite (Tauri)

### API Endpoints

See [docs/api/flomo.md](../api/flomo.md) for complete API documentation.

**Sync Endpoints:**

- `GET /api/flomo?Action=FullSync` - Download all data (initial sync)
- `GET /api/flomo?Action=Pull&since={version}` - Incremental pull
- `POST /api/flomo?Action=Push` - Upload local changes

**Traditional CRUD:**

- `/api/card?Action=CreateCard`, `UpdateCard`, `DeleteCard`, etc.
- Note: These endpoints still work but are not used in local-first mode
