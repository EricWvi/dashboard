# Flomo

Flomo is a local-first, card-based note-taking system with folder organization and rich text editing. It's designed for quick note capture with efficient offline-first synchronization.

## Overview

Flomo implements a zettelkasten-inspired note-taking approach where:

- **Cards** are individual notes with optional folder organization
- **Folders** provide hierarchical organization (can be nested)
- **Rich Text** editing powered by TipTap editor
- **Local-First** architecture enables offline use with automatic sync

## Architecture

```
client/src/
├── flomo-main.tsx                  # Flomo app entry point
├── FlomoApp.tsx                    # Main app component
├── components/
│   ├── flomo/                      # Flomo-specific components
│   │   ├── icons.tsx               # Custom icons
│   │   ├── sidebar.tsx             # AppSidebar: root sidebar component
│   │   ├── card-content.tsx        # Main content area for the selected folder
│   │   ├── card-header.tsx         # Header with breadcrumb folder-path navigation
│   │   ├── nav-folders.tsx         # Sidebar section: subfolders of current folder
│   │   ├── nav-cards.tsx           # Sidebar section: cards in current folder
│   │   ├── nav-adds.tsx            # Sidebar section: add-card / add-folder actions
│   │   └── nav-tabs.tsx            # Sidebar footer: currently opened editors
│   ├── tiptap-*/                   # Shared TipTap editor components
│   └── ui/                         # Shared UI library (shadcn/ui)
├── hooks/
│   ├── flomo/                      # Flomo-specific React hooks
│   │   ├── query-keys.ts           # React Query cache keys
│   │   ├── use-app-state.ts        # Zustand store
│   │   ├── use-cards.ts            # Card CRUD operations hook
│   │   └── use-folders.ts          # Folder CRUD operations hook
│   ├── tiptap/
│   │   └── use-tiptapv2.ts         # TipTap document operations hook
│   ├── use-mobile.ts               # Mobile/desktop detection hook
│   ├── use-throttled-callback.ts   # Performance optimization hook
│   └── ...                         # Other shared hooks
├── lib/
│   ├── flomo/                      # Flomo core logic and database
│   │   ├── db-interface.ts         # Database interface abstraction
│   │   ├── dexie.ts                # IndexedDB implementation (Dexie.js)
│   │   ├── model.ts                # TypeScript types and models
│   │   └── sync-manager.ts         # Synchronization logic manager
│   ├── model.ts                    # Shared models, such as MetaField and TiptapV2
│   └── ...                         # Other shared utilities
├── pages/
│   └── Flomo.tsx                   # Main site page
└── index.css                       # Global styles and Tailwind directives

client/
├── flomo.html                      # HTML entry point for Flomo app
├── vite.flomo.config.ts            # Vite build config (separate from dashboard)
└── public-flomo/                   # Flomo-specific static assets
```

## Data Model

### MetaField

```typescript
interface MetaField {
  id: string; // UUID
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
  isDeleted: boolean;
  syncStatus: number;
}
```

### User

User profile information synchronized from the server:

```typescript
export interface UserField {
  username: string;
  avatar: string;
  language: string;
}

export interface User extends UserField {
  key: string;
  updatedAt: number; // Unix timestamp in milliseconds
  syncStatus: number;
}
```

**Note**: User profile is managed centrally through the dashboard and synced read-only to Flomo.

### Card

A card represents a single note with the following structure:

```typescript
export interface CardField {
  folderId: string; // UUID
  title: string;
  draft: string; // UUID
  payload: Record<string, unknown>;
  rawText: string;
}

export interface Card extends MetaField, CardField {}
```

### Folder

Folders organize cards hierarchically:

```typescript
export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: Record<string, unknown>;
}

export interface Folder extends MetaField, FolderField {}
```

### TiptapV2

Rich text content for cards:

```typescript
export interface TiptapV2Field {
  content: Record<string, unknown>;
  history: unknown[];
}

export interface TiptapV2 extends MetaField, TiptapV2Field {}
```

## API Endpoints

### Local-First Sync API (`/api/flomo`)

These endpoints support efficient offline-first synchronization:

#### FullSync

- **Endpoint**: `GET /api/flomo?Action=FullSync`
- **Purpose**: Initial sync or recovery
- **Returns**: All non-deleted user profile, cards, folders, and tiptap documents
- **Use Case**: First app launch, after clearing local data

#### Pull

- **Endpoint**: `GET /api/flomo?Action=Pull&since={serverVersion}`
- **Purpose**: Incremental sync from server
- **Returns**: All changes with `serverVersion > since`, including user profile updates
- **Includes**: Deleted items for local cleanup
- **Use Case**: Regular sync loop, background refresh

#### Push

- **Endpoint**: `POST /api/flomo?Action=Push`
- **Purpose**: Upload local changes to server
- **Body**: Arrays of cards, folders, tiptaps (user profile not pushed from Flomo)
- **Logic**: Upsert by UUID, checks `updatedAt` for Last-Write-Wins
- **Use Case**: After local edits, periodic upload

## Synchronization Strategy

1. **Initial Load**:
   - Call `FullSync` to get complete dataset
   - Store in local database (IndexedDB/SQLite)
   - Track highest `serverVersion` received

2. **Offline Operation**:
   - Create/edit/delete cards locally
   - Generate UUIDs for new items
   - Set `createdAt` and `updatedAt` with local time
   - Queue changes for upload

3. **Upload Changes**:
   - Batch local changes into `Push` request
   - Send cards, folders, tiptaps arrays
   - On success, mark items as synced

4. **Background Sync**:
   - Periodically call `Pull` with last known `serverVersion`
   - Apply server changes to local database
   - Handle deletions (remove items where `isDeleted: true`)
   - Update tracked `serverVersion`

## UI Components

### AppSidebar (`sidebar.tsx`)

The root sidebar component rendered inside `SidebarProvider` in `Flomo.tsx`. Composed of:

| Section          | Component    | Description                                                                                         |
| ---------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| Header           | _(static)_   | App branding / logo                                                                                 |
| Content – top    | `NavFolders` | Lists subfolders of the current folder, sorted alphabetically. Clicking a folder navigates into it. |
| Content – middle | `NavCards`   | Lists cards in the current folder, sorted newest-first.                                             |
| Content – bottom | `NavAdds`    | Add-card and add-folder action buttons that open dialogs.                                           |
| Footer           | `NavTabs`    | Switch between currently opened editors.                                                            |

### CardContent (`card-content.tsx`)

The main content pane rendered inside `SidebarInset`.

### CardHeader (`card-header.tsx`)

Sticky header inside the content pane. Shows a breadcrumb trail of the current folder path (root → … → current) using `useFolderPath`. Each breadcrumb segment is clickable and calls `setCurrentFolderId` to navigate up the hierarchy.

### NavAdds (`nav-adds.tsx`)

Provides two modal dialogs:

- **Add Card** – creates a card under the current folder (`useCreateCard`). Accepts a title via text input; submits on Enter or button click.
- **Add Folder** – creates a subfolder under the current folder (`useCreateFolder`). Same input behaviour.

Both dialogs support IME composition (CJK input) via `onCompositionStart`/`onCompositionEnd`.

## App State

### `useAppState` (Zustand store)

File: `client/src/hooks/flomo/use-app-state.ts`

A global Zustand store that tracks the currently focused folder as the user navigates the sidebar.

```typescript
interface AppState {
  currentFolderId: string; // defaults to RootFolderId
  setCurrentFolderId: (id: string) => void;
}
```

`currentFolderId` is initialised to `RootFolderId` (the virtual root). Components read and update this value to drive which folders and cards are displayed in both the sidebar and the main content area.

## Features

### Core Functionality

- **Quick Capture**: Fast note creation with minimal friction
- **Folder Organization**: Hierarchical folder structure for grouping
- **Rich Text**: Full TipTap editor with formatting, links, etc.
- **Search**: Full-text search across card titles and content (`rawText`)

### Offline-First Benefits

- **No Latency**: All operations instant on local device
- **Reliable**: Works without internet connection
- **Conflict-Free**: UUID-based identity prevents conflicts
- **Efficient**: Only sync changed data, not full dataset

### Sync Guarantees

- **Eventual Consistency**: All devices converge to same state
- **Causal Ordering**: `server_version` preserves operation order
- **Soft Delete Sync**: Deletions propagate to all clients
- **Last-Write-Wins**: Conflicts resolved by `updatedAt` timestamp

## Development

### Building Flomo

```bash
cd client
npm run build:flomo
```

### Running Locally

```bash
# Start backend
go run .

# Start frontend dev server
cd client
npm run dev:flomo
```
