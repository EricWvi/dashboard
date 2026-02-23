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
export interface CardPayload {
  emoji?: string;
}

export interface CardField {
  folderId: string; // UUID
  title: string;
  draft: string; // UUID
  payload: CardPayload;
  rawText: string;
}

export interface Card extends MetaField, CardField {}
```

### Folder

Folders organize cards hierarchically:

```typescript
export interface FolderPayload {
  emoji?: string;
}

export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: FolderPayload;
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

## UI Style Guidelines

### Colors

Flomo uses a neutral, monochromatic palette via CSS custom properties (oklch tokens). Key semantic tokens:

| Token                  | Light                        | Dark                         | Usage                        |
| ---------------------- | ---------------------------- | ---------------------------- | ---------------------------- |
| `background`           | `oklch(1 0 0)` (white)       | `oklch(0.145 0 0)` (near-black) | Page / sidebar background |
| `foreground`           | `oklch(0.145 0 0)`           | `oklch(0.985 0 0)`           | Default text                 |
| `muted-foreground`     | `oklch(0.556 0 0)`           | `oklch(0.708 0 0)`           | Placeholder / secondary text |
| `accent`               | `oklch(0.97 0 0)`            | `oklch(0.269 0 0)`           | Hover highlight              |
| `destructive`          | `oklch(0.581 0.214 27.33)`   | same                         | Delete actions               |
| `emoji-accent`         | `oklch(0.92 0 0)`            | `oklch(0.35 0 0)`            | Emoji button hover           |

Dark mode switches automatically via `@media (prefers-color-scheme: dark)`.

### Typography

- **Font**: OPPO Sans 4.0, falling back to system sans-serif.
- **Size**: `text-sm` for sidebar items; `text-xs` for supplementary labels.
- **Weight**: `font-medium` for titles; default for body.
- **Line height**: `leading-tight` in compact list rows.

### Spacing & Layout

- Spacing follows Tailwind's scale: `gap-2` / `gap-4`, `px-2` / `px-4`, `py-2`.
- **Two-panel**: `SidebarProvider` (inset variant) + `SidebarInset`. Sidebar collapses on mobile.
- **Dialogs**: `sm:max-w-md` width, `space-y-4` internal spacing.
- **Responsive**: `hidden md:block` hides non-essential elements on small screens.

### Icons

- **Lucide React** for all system icons (e.g. `Search`, `FolderPlus`, `Trash2`, `MoreHorizontal`).
- **Custom SVG components** for brand marks: `FlomoLogo`, `FlomoText`.
- **Emoji system**: default folder emoji 📂, default card emoji 📄; user-customizable via `EmojiPicker`.

### Interactive States

- Hover: `hover:bg-accent` on list items; `hover:bg-emoji-accent` on emoji buttons.
- Active / open dropdown: `data-[state=open]:bg-sidebar-accent`.
- Destructive actions: `text-destructive` (red) with matching icon color.
- Buttons are `disabled` during async mutations to prevent double-submission.

### Dialogs & Forms

- Every create / rename / move / delete action uses a **modal dialog**.
- Text inputs auto-focus, submit on **Enter**, and handle IME composition (CJK-safe).
- Button pairs: **Cancel** (outline) + **Confirm / Action** (primary or destructive).
- Internationalization (i18n): all user-facing strings go through the inline `i18nText` map (Chinese & English).

## UI Components

### AppSidebar (`sidebar.tsx`)

The root sidebar component rendered inside `SidebarProvider` in `Flomo.tsx`. Composed of:

| Section          | Component    | Description                                                                                                                                                               |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header           | _(static)_   | App branding / logo                                                                                                                                                       |
| Content – top    | `NavFolders` | Lists subfolders of the current folder, sorted alphabetically. Clicking a folder navigates into it. Each folder has a context menu with Rename, Move, and Delete actions. |
| Content – middle | `NavCards`   | Lists cards in the current folder, sorted newest-first. Each card has a context menu with Rename, Move, and Delete actions.                                               |
| Content – bottom | `NavAdds`    | Add-card and add-folder action buttons that open dialogs.                                                                                                                 |
| Footer           | `NavTabs`    | Switch between currently opened editors.                                                                                                                                  |

### CardContent (`card-content.tsx`)

The main content pane rendered inside `SidebarInset`.

### CardHeader (`card-header.tsx`)

Sticky header inside the content pane. Shows a breadcrumb trail of the current folder path (root → … → current) using `useFolderPath`. Each breadcrumb segment is clickable and calls `setCurrentFolderId` to navigate up the hierarchy.

### NavFolders (`nav-folders.tsx`)

Each folder entry shows an emoji (defaulting to 📂) that opens an `EmojiPicker` on click. A `MoreHorizontal` context menu exposes three actions, each backed by a dedicated dialog:

| Dialog | Component            | Behaviour                                                                                                                                  |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rename | `RenameFolderDialog` | Pre-fills current title; updates on Enter or Confirm. IME-safe.                                                                            |
| Move   | `MoveFolderDialog`   | Breadcrumb + folder-list navigator. The folder being moved is excluded from the target list. Calls `useUpdateFolder` to update `parentId`. |
| Delete | `DeleteFolderDialog` | Confirmation dialog. Calls `useDeleteFolder`.                                                                                              |

### NavCards (`nav-cards.tsx`)

Each card entry shows an emoji (defaulting to 📄) that opens an `EmojiPicker` on click. A `MoreHorizontal` context menu exposes three actions:

| Dialog | Component          | Behaviour                                                                       |
| ------ | ------------------ | ------------------------------------------------------------------------------- |
| Rename | `RenameCardDialog` | Pre-fills current title; updates on Enter or Confirm. IME-safe.                 |
| Move   | `MoveCardDialog`   | Breadcrumb + folder-list navigator. Calls `useUpdateCard` to update `folderId`. |
| Delete | `DeleteCardDialog` | Confirmation dialog. Calls `useDeleteCard`.                                     |

The Move dialogs for both folders and cards share the same UX pattern: a horizontally scrollable breadcrumb trail (auto-scrolls to the rightmost segment) and a scrollable folder list fetched on-the-fly via `flomoDatabase.getFoldersInParent`.

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
