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
├── editor-provider.tsx             # TiptapProvider: shared editor context and auto-save logic
├── components/
│   ├── flomo/                      # Flomo-specific components
│   │   ├── icons.tsx               # Custom icons
│   │   ├── sidebar.tsx             # AppSidebar: root sidebar component
│   │   ├── emoji-picker.tsx        # Emoji Picker for card/folder icon
│   │   ├── card-content.tsx        # Main content area for the selected folder
│   │   ├── card-header.tsx         # Header with bookmark, edit, and more actions
│   │   ├── card-dialogs.tsx        # Shared card dialog components (Rename, Move, Delete)
│   │   ├── card-pane.tsx           # Content pane: shows FlomoHome or active card editor
│   │   ├── home-page.tsx           # FlomoHome: start page with bookmarks and recent cards
│   │   ├── nav-folders.tsx         # Sidebar section: subfolders of current folder
│   │   ├── nav-cards.tsx           # Sidebar section: cards in current folder
│   │   ├── nav-adds.tsx            # Sidebar section: add-card / add-folder actions
│   │   ├── nav-path.tsx            # Sidebar section: tree-style current folder path
│   │   └── nav-tabs.tsx            # Sidebar footer: currently opened editors
│   ├── tiptap-*/                   # Shared TipTap editor components
│   └── ui/                         # Shared UI library (shadcn/ui)
├── hooks/
│   ├── flomo/                      # Flomo-specific React hooks
│   │   ├── query-keys.ts           # React Query cache keys
│   │   ├── use-app-state.ts        # Zustand store (navigation state only)
│   │   ├── use-cards.ts            # Card CRUD operations hook
│   │   ├── use-folders.ts          # Folder CRUD operations hook
│   │   └── use-tiptapv2.ts         # TipTap document operations hook
│   ├── use-editor-state.ts         # Zustand store (editor tab & instance state)
│   ├── use-mobile.ts               # Mobile/desktop detection hook
│   ├── use-throttled-callback.ts   # Performance optimization hook
│   └── ...                         # Other shared hooks
├── lib/
│   ├── flomo/                      # Flomo core logic and database
│   │   ├── animations.ts           # Shared framer-motion variants for sidebar transitions
│   │   ├── db-interface.ts         # Database interface abstraction
│   │   ├── dexie.ts                # IndexedDB implementation (Dexie.js)
│   │   ├── sqlite.ts               # SQLite/Tauri implementation (Android)
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

## Features

### Core Functionality

- **Quick Capture**: Fast note creation with minimal friction
- **Folder Organization**: Hierarchical folder structure for grouping
- **Rich Text**: Full TipTap editor with formatting, links, etc.
- **Search**: Full-text search across card titles and content (`rawText`)
- **Archive Mode**: Cards and folders can be archived (`isArchived = 1`) to remove them from normal view without deleting. Toggle between normal and archive views via `isArchiveMode` in app state. The components and corresponding styles are designed to support both modes seamlessly.
- **Bookmarks**: Cards and folders support a bookmark flag (`isBookmarked`) for quick-access marking. Bookmarked items display a `Sparkles` icon next to their title in the sidebar. The **homepage** (`FlomoHome`) surfaces bookmarked folders and cards in a dedicated "Quick Access" grid.

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
  sortOrder: string;
}

export interface CardField {
  folderId: string; // UUID
  title: string;
  draft: string; // UUID
  payload: CardPayload;
  rawText: string;
  isBookmarked: 0 | 1;
  isArchived: 0 | 1;
}

export interface Card extends MetaField, CardField {}
```

### Folder

Folders organize cards hierarchically:

```typescript
export interface FolderPayload {
  emoji?: string;
  sortOrder: string;
}

export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: FolderPayload;
  isBookmarked: 0 | 1;
  isArchived: 0 | 1;
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

| Token              | Light                      | Dark                            | Usage                        |
| ------------------ | -------------------------- | ------------------------------- | ---------------------------- |
| `background`       | `oklch(1 0 0)` (white)     | `oklch(0.145 0 0)` (near-black) | Page / sidebar background    |
| `foreground`       | `oklch(0.145 0 0)`         | `oklch(0.985 0 0)`              | Default text                 |
| `muted-foreground` | `oklch(0.556 0 0)`         | `oklch(0.708 0 0)`              | Placeholder / secondary text |
| `accent`           | `oklch(0.97 0 0)`          | `oklch(0.269 0 0)`              | Hover highlight              |
| `destructive`      | `oklch(0.581 0.214 27.33)` | same                            | Delete actions               |
| `emoji-accent`     | `oklch(0.92 0 0)`          | `oklch(0.35 0 0)`               | Emoji button hover           |

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

## Editor Architecture

### Overview

The TipTap editor follows a **single shared instance** model. One `Editor` object is created per `CardPane` and shared to all child components through `EditorContext`. Tab switching is handled by saving/restoring ProseMirror `EditorState` objects rather than destroying and recreating the editor.

### `TiptapProvider` (`editor-provider.tsx`)

The root of the editor subsystem. Defined in `src/editor-provider.tsx` (shared, not Flomo-specific). Rendered in `Flomo.tsx` wrapping the entire `CardPane`.

Responsibilities:

- Creates the single `Editor` instance via `useSimpleEditor` (configured with all extensions).
- Exposes the editor to descendants via `EditorContext.Provider` (from `@tiptap/react`).
- Accepts a `persistence` prop — `{ syncDraft, getContent }` — that callers inject. This makes `TiptapProvider` decoupled from the flomo-specific persistence layer.
- Wires up a **debounced auto-save** (500 ms, via `syncDraft`) that fires on every editor update.

The `EditorState` sub-component (rendered inside `TiptapProvider`, returns `null`) owns all side-effects:

| Effect             | Trigger                                              | Action                                                                                                               |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tab switch         | `activeTabId` changes                                | Flush debounce; save current `EditorState` to `instanceMap`; restore cached state for new tab or load from IndexedDB |
| Home navigation    | `activeTabId` becomes `null`                         | Flush debounce; save current state; stop — no new content to load                                                    |
| Cache invalidation | `instanceMap` entry for `activeTabId` becomes `null` | Reload draft content from IndexedDB                                                                                  |

### `useSimpleEditor` hook (`simple-editor.tsx`)

A thin wrapper around TipTap's `useEditor` that configures all extensions (StarterKit, custom nodes, etc.) and accepts an optional `onUpdate` callback. Used exclusively by `TiptapProvider` to create the shared editor.

### `EditorToolbar` component (`simple-editor.tsx`)

Previously this UI lived inside `SimpleEditor`. It is now a standalone component that reads the shared editor from `EditorContext` via `useTiptapEditor()`. Rendered by `CardHeader` so the toolbar appears in the page header rather than inline with the content.

The toolbar provides:

- Formatting actions (desktop toolbar + mobile toolbar with view switcher)
- **Save** — calls `onSave(editor)` and optionally invokes `onClose`
- **Discard** — calls `onDrop(editor)` to revert to the original content without a server round-trip
- Keyboard shortcut `Mod+S` to save

The history functions (`listHistory`, `getHistory`, `restoreHistory`) are now context-free callbacks — callers bind the document `id` themselves before passing them in.

### `SimpleEditor` component (`simple-editor.tsx`)

Renders the contenteditable area for the active tab. Reads the editor from `EditorContext`; does **not** instantiate or own the editor itself. Guarded by `activeTabId` in `CardContent` (returns `null` when no tab is active).

---

## UI Components

### CardPane (`card-pane.tsx`)

The right-hand content area inside `SidebarInset`. Acts as a router between two views:

- When `activeTabId === null` (no open tab): renders `<FlomoHome />`.
- When a tab is active: renders `<CardHeader />` followed by `<CardContent />`.

The sidebar's search button calls `hideTabs()` to show `FlomoHome`.

### AppSidebar (`sidebar.tsx`)

The root sidebar component rendered inside `SidebarProvider` in `Flomo.tsx`. Composed of:

| Section         | Component    | Description                                                                                                                                                                                                   |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header          | _(static)_   | App branding / logo                                                                                                                                                                                           |
| Header          | `NavPath`    | Tree-style path navigator showing the ancestry from root (or archive root) to the current folder. Each node is clickable and calls `setCurrentFolderId`. Height change animates smoothly via `framer-motion`. |
| Content – upper | `NavFolders` | Lists subfolders of the current folder, sorted alphabetically. Clicking a folder navigates into it. Each folder has a context menu with Rename, Move, and Delete actions. Content fades in on folder change.  |
| Content – lower | `NavCards`   | Lists cards in the current folder, sorted newest-first. Each card has a context menu with Rename, Move, and Delete actions. Content fades in on folder change.                                                |
| Footer          | `NavAdds`    | Add-card and add-folder action buttons that open dialogs.                                                                                                                                                     |
| Footer          | `NavTabs`    | Dropdown showing open editor tabs. Each entry displays an eye (`Eye`) or pen (`PenLine`) icon to indicate read/edit mode, and clicking it switches the active tab.                                            |

### `FlomoHome` (`home-page.tsx`)

The start page shown inside `CardPane` when no editor tab is active (`activeTabId === null`). Divided into two sections:

| Section          | Content                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quick Access     | Grid of bookmarked folders and cards. Clicking a folder calls `setCurrentFolderId`; clicking a card opens it in a new tab.                                 |
| Recently Updated | Grid of the 8 most recently updated cards (ordered by `updatedAt` DESC), each showing emoji, title, relative timestamp, and a 3-line preview of `rawText`. |

A search input is rendered at the top (currently read-only).

### CardContent (`card-content.tsx`)

The main content pane rendered inside `SidebarInset`. Guards on `activeTabId` — returns `null` when no tab is open. Renders `<SimpleEditor />` which reads the shared editor from context.

### NavPath (`nav-path.tsx`)

A sidebar section rendered in the `SidebarHeader`. Displays the folder ancestry from root (or the nearest archived ancestor in archive mode) down to the current folder as a vertical tree: connected nodes with lines and circles, where the current folder node is highlighted. Each node is clickable and calls `setCurrentFolderId` to jump directly to that level. Uses `useFolderPath` internally.

The tree content is wrapped in a `motion.div` whose height is tracked via a callback ref + `ResizeObserver`. When the path grows or shrinks (e.g. navigating deeper or back), the container height animates over 250 ms (easeOut), smoothly pushing `NavFolders`/`NavCards` in `SidebarContent` down or up.

### CardHeader (`card-header.tsx`)

Sticky header inside the content pane. Guards on `activeTabId` — returns `null` when no tab is open. Shows the sidebar trigger. On the right side (when not editing):

| Button | Icon / Label                         | Behaviour                                                                                                                                                  |
| ------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Star   | `StarOutlineIcon` / `StarFilledIcon` | Toggles `isBookmarked` (0 ↔ 1) via `useUpdateCard`. Uses `framer-motion` `AnimatePresence` for a scale+opacity animation on toggle. Filled star is yellow. |
| Edit   | Text label ("编辑"/"Edit")           | Green-themed button (`#30D07A` brand color) with light/dark theme variants. Enters edit mode (`setTabEditable`).                                           |
| More   | `Menu`                               | Opens a dropdown menu with Rename, Move, Archive/Restore, Delete — same as `NavCards` sidebar menu minus the bookmark item.                                |

When editing, the right side shows `<EditorToolbar />` instead, providing formatting actions and save/discard controls.

The card data is fetched via `useCard(cardId)` where `cardId` is stored in the `cardMap` and set when opening a card from `NavCards`.

### NavFolders (`nav-folders.tsx`)

Each folder entry shows an emoji (defaulting to 📂) that opens an `EmojiPicker` on click. A `Sparkles` icon is displayed next to the title when `isBookmarked === 1`. A `MoreHorizontal` context menu exposes actions backed by dedicated dialogs. The entire section is wrapped in `AnimatePresence mode="wait"` with a `motion.div` keyed by `currentFolderId`, giving a 300 ms easeOut opacity fade-in whenever the active folder changes.

Folder sorting uses independent inter-item `DropZone` rows. Rendering follows `[Zone0, Item1, Zone1, Item2, ...]`, with `SidebarMenu` gap set to `gap-0`. The visual row stays 4px (`h-1`), and an absolutely positioned 8px transparent sensor layer is used for easier hit detection; a centered 2px insertion line is shown only while hovered by a draggable folder. The target `sortOrder` is deterministic per zone: `generateKeyBetween(prevOrder, nextOrder)`. Zones also block drops when the dragged folder id is one of the two adjacent ids, preventing redundant "insert into current position" operations.

| Action  | Component            | Behaviour                                                                                                                                  |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rename  | `RenameFolderDialog` | Pre-fills current title; updates on Enter or Confirm. IME-safe.                                                                            |
| Move    | `MoveFolderDialog`   | Breadcrumb + folder-list navigator. The folder being moved is excluded from the target list. Calls `useUpdateFolder` to update `parentId`. |
| Archive | fire directly        | Sets `isArchived = 1` via `useUpdateFolder`. Archived folders are hidden from normal navigation.                                           |
| Restore | fire directly        | Async; checks whether the parent folder still exists. If it has been deleted, the folder is restored to the root folder instead.           |
| Delete  | `DeleteFolderDialog` | Confirmation dialog. Calls `useDeleteFolder`.                                                                                              |

Dropdown menus set `onCloseAutoFocus={(e) => e.preventDefault()}` to prevent the sidebar from stealing focus after a menu action.

### NavCards (`nav-cards.tsx`)

Each card entry shows an emoji (defaulting to 📄) that opens an `EmojiPicker` on click. A `Sparkles` icon is displayed next to the title when `isBookmarked === 1`. A `MoreHorizontal` context menu exposes actions. Like `NavFolders`, the section uses `AnimatePresence mode="wait"` with a `motion.div` keyed by `currentFolderId` for a 300 ms easeOut fade-in on folder change.

Card sorting uses the same `DropZone` architecture as folders: cards are draggable-only display rows, while each visual 4px zone (`h-1`) contains an invisible 8px sensor layer for drop sensing and displays a centered 2px insertion line when active. This maps each zone directly to a deterministic `generateKeyBetween(prevOrder, nextOrder)` result. Zones reject drops when the dragged card id matches either adjacent id to avoid no-op self-adjacent inserts.

| Action   | Component          | Behaviour                                                                                                                      |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Bookmark | fire directly      | Toggles `isBookmarked` (0 ↔ 1) via `useUpdateCard`. Shows `Star`/`StarOff` icon based on current state.                        |
| Rename   | `RenameCardDialog` | Pre-fills current title; updates on Enter or Confirm. IME-safe.                                                                |
| Move     | `MoveCardDialog`   | Breadcrumb + folder-list navigator. Calls `useUpdateCard` to update `folderId`.                                                |
| Archive  | fire directly      | Sets `isArchived = 1` via `useUpdateCard`. Archived cards are hidden from normal listing.                                      |
| Restore  | fire directly      | Async; checks whether the parent folder still exists. If it has been deleted, the card is restored to the root folder instead. |
| Delete   | `DeleteCardDialog` | Confirmation dialog. Calls `useDeleteCard`.                                                                                    |

Dialog components (`RenameCardDialog`, `MoveCardDialog`, `DeleteCardDialog`) are imported from `card-dialogs.tsx` and shared with `CardHeader`.

Dropdown menus set `onCloseAutoFocus={(e) => e.preventDefault()}` to prevent focus stealing after a menu action.

Clicking a card calls `openCard`, which opens an editor tab (with `cardId` set) without passing content — content loading is fully delegated to `TiptapProvider` (either from the `instanceMap` cache or from IndexedDB).

The Move dialogs for both folders and cards share the same UX pattern: a horizontally scrollable breadcrumb trail (auto-scrolls to the rightmost segment) and a scrollable folder list fetched on-the-fly via `flomoDatabase.getFoldersInParent`.

### NavAdds (`nav-adds.tsx`)

Provides two modal dialogs:

- **Add Card** – creates a card under the current folder (`useCreateCard`). Accepts a title via text input; submits on Enter or button click.
- **Add Folder** – creates a subfolder under the current folder (`useCreateFolder`). Same input behaviour.

Both dialogs support IME composition (CJK input) via `onCompositionStart`/`onCompositionEnd`.

## App State

### `useAppState` (Zustand store)

File: `client/src/hooks/flomo/use-app-state.ts`

A Zustand store that covers **navigation state only**.

```typescript
interface AppState {
  // Navigation
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;

  isArchiveMode: boolean;
  enterArchiveMode: () => void;
  exitArchiveMode: () => void;
}
```

`currentFolderId` is initialised to `RootFolderId` (the virtual root). `isArchiveMode` controls whether the sidebar and content area show archived or regular cards/folders.

### `useEditorState` (Zustand store)

File: `client/src/hooks/use-editor-state.ts`

Editor tab management and editor instance cache.

```typescript
export interface EditorTab {
  draftId: string; // UUID of the TiptapV2 document
  title: string;
  editable: boolean;
}

interface TabState {
  // Editor tabs
  openTabs: EditorTab[];
  activeTabId: string | null; // draftId of focused tab
  openTab: (tab: EditorTab) => void; // add or focus existing tab
  closeTab: (draftId: string) => void; // remove tab
  setActiveTab: (draftId: string) => void; // switch focus
  getTabById: (draftId: string) => EditorTab | undefined; // get tab by draftId
  getTabEditable: (draftId: string) => boolean; // get read/edit mode for a tab
  setTabEditable: (draftId: string, editable: boolean) => void; // toggle read/edit mode

  instanceMap: Record<string, EditorState | null>; // Map of draftId to editor instance
  getCurrentInstance: () => EditorState | null; // get editor instance for a tab
  invalidateTabInstance: (draftId: string) => void; // mark tab instance as stale, forcing reload from IndexedDB
  saveInstance: (draftId: string, instance: EditorState) => void; // update editor instance
  invalidateAllTabs: () => void; // mark all tabs as stale (for full sync)

  initialContentMap: Record<string, Record<string, unknown> | null>; // Map of draftId to initial content
  setInitialContent: (
    draftId: string,
    content: Record<string, unknown>,
  ) => void; // set initial content for a tab (used when opening a card)
  getInitialContent: (draftId: string) => Record<string, unknown> | null; // get initial content for a tab

  scrollPositionMap: Record<string, number>; // Map of draftId to scroll position
  saveScrollPosition: (draftId: string, scrollTop: number) => void;
  getScrollPosition: (draftId: string) => number;
}
```

`instanceMap` is the key to fast tab switching: when the user leaves a tab, its live `EditorState` (including cursor position, selection, undo history) is serialised into the map. When returning to that tab, the state is restored synchronously with `editor.view.updateState()`. A `null` entry means the tab must reload from IndexedDB.

`initialContentMap` stores the JSON content as it was when a draft was first loaded into the editor, enabling the **Discard** action to revert cleanly.

`scrollPositionMap` persists the scroll offset of the content container for each open tab. Position is saved when the user scrolls and restored when switching back to that tab, so the reading position is not lost across tab switches.

Closing a tab removes its entries from `instanceMap`, `initialContentMap`, and `scrollPositionMap` to avoid memory leaks.

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
