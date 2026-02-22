# Flomo Editor — Single → Multiple Instance Migration

## Current Architecture (Single Editor)

The dashboard and journal apps share a **single-editor** pattern built on three pieces:

### TTProvider (`client/src/components/editor.tsx`)

A React context that holds **one** draft at a time:

```typescript
type TTEditorContext = {
  open: boolean;       // editor overlay visible?
  setOpen: (open: boolean) => void;
  id: number;          // active draft ID (server auto-increment integer)
  setId: (n: number) => void;
};
```

> **ID types differ between apps.** Dashboard/Journal use numeric IDs (`number`) from the server's auto-increment primary key. Flomo uses UUID strings (`string`) for its local-first data model. The migration must account for this — `SimpleEditor` should accept `id` as `number | string` (or the Flomo wrapper can convert).

`SimpleEditorWrapper` sits at the app root and renders a fixed full-screen overlay (`z-50`) when `open && !!draft`:

```tsx
// DashboardApp.tsx / JournalApp.tsx
<TTProvider>
  <MainPage />
  <SimpleEditorWrapper onClose={onClose} />
</TTProvider>
```

### CloseActionProvider (`client/src/close-action-provider.tsx`)

Stores a **single** `onClose` callback:

```typescript
type CloseActionContextType = {
  onClose: (e: Editor, changed: boolean) => void;
  setOnClose: (fn: (e: Editor, changed: boolean) => void) => void;
};
```

Before opening the editor, the caller sets the callback:

```typescript
setOnClose(() => (e: Editor, changed: boolean) => { /* handle result */ });
setEditorId(draft);
setEditorDialogOpen(true);
```

### SimpleEditor (`client/src/components/tiptap-templates/simple/simple-editor.tsx`)

The editor component itself. It:

1. Reads `id` from `useTTContext()` to know which draft it syncs.
2. Calls `syncDraft({ id, ... })` every 5 seconds when dirty.
3. On save/drop, calls `setId(0)` and `setOpen(false)` to dismiss itself.
4. Invokes `onClose(editor, changed)` so the caller can react.

### Limitations

| Constraint | Reason |
|---|---|
| Only one editor open at a time | `TTProvider` holds a single `id` + `open` flag |
| Close callback is global | `CloseActionProvider` overwrites on every open |
| Editor identity lives in context | `SimpleEditor` reads `id` from context, not props |
| Full-screen overlay only | `SimpleEditorWrapper` renders a `fixed inset-0 z-50` div |

---

## Target Architecture (Multiple Editors)

Flomo needs multiple editors open simultaneously as tabs (see `NavTabs` in the sidebar). Each editor instance must:

- Track its **own** draft ID and dirty/sync state.
- Save and close **independently**.
- Live inside a tabbed layout, not a full-screen overlay.

### Key Design Decisions

1. **Push identity into props, not context.** Each editor receives its own `id` and `onClose` through props so that multiple instances don't fight over a shared context.

2. **Replace global open/id state with a tab list.** Instead of `{ open, id }`, Flomo manages `openTabs: Tab[]` in Zustand where each tab owns its draft ID.

3. **Keep the existing single-editor path working.** Dashboard and Journal still use `TTProvider` + `SimpleEditorWrapper` unchanged. The refactor is additive: a new `StandaloneEditor` wrapper lives alongside the old one.

---

## Migration Plan

### Step 1 — Make `SimpleEditor` accept `id` as a prop

Currently `SimpleEditor` calls `useTTContext()` to read `id`, `setId`, and `setOpen`. Refactor so that:

- `id` is passed as a **prop** instead of read from context.
- `onSave` / `onDrop` callbacks close the editor via an `onClose` prop rather than manipulating context.

```diff
 export function SimpleEditor({
   draft,
   ts,
+  id,
   showToast,
   removeCache,
   onClose,
 }: {
   draft: any;
   ts: number;
+  id: number;
   showToast: boolean;
   removeCache: boolean;
   onClose: (e: Editor, changed: boolean) => void;
 }) {
-  const { id, setId, setOpen } = useTTContext();
```

Inside `handleSave` and `handleDrop`, replace:

```diff
-  setId(0);
-  setOpen(false);
```

with calling `onClose(editor, changed)` directly (which the parent will use to remove the tab or close the overlay). The parent is now responsible for cache cleanup:

```diff
-  if (removeCache) {
-    removeDraftQuery(id);
-  } else {
-    invalidateDraftQuery(id);
-  }
```

#### Backward compatibility

Update `SimpleEditorWrapper` (the existing single-editor overlay) to pass `id` as a prop:

```tsx
export const SimpleEditorWrapper = ({ showToast, removeCache, onClose }) => {
  const { open, id } = useTTContext();
  const { data: draft } = useDraft(id);

  const handleClose = (e: Editor, changed: boolean) => {
    setId(0);
    setOpen(false);
    if (removeCache) removeDraftQuery(id);
    else invalidateDraftQuery(id);
    onClose(e, changed);
  };

  return open && !!draft && (
    <div className="bg-background fixed inset-0 z-50">
      <SimpleEditor
        key={draft.ts}
        id={id}
        draft={draft.content}
        ts={draft.ts}
        showToast={showToast}
        removeCache={removeCache}
        onClose={handleClose}
      />
    </div>
  );
};
```

Dashboard and Journal apps continue to work without changes.

### Step 2 — Extract `HistoryPopover` dependency on context

`HistoryPopover` already receives `id` and `editor` as props. No changes needed.

### Step 3 — Extend Flomo app state with editor tabs

Add tab tracking to the Zustand store (`use-app-state.ts`):

```typescript
interface EditorTab {
  cardId: string;     // Card UUID that owns this draft
  draftId: string;    // TiptapV2 UUID (1:1 with card — each card has exactly one draft)
  title: string;      // Display title for the tab
}

interface AppState {
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;

  // Editor tabs
  openTabs: EditorTab[];
  activeTabId: string | null;               // draftId of focused tab
  openTab: (tab: EditorTab) => void;        // add or focus existing tab
  closeTab: (draftId: string) => void;      // remove tab
  setActiveTab: (draftId: string) => void;  // switch focus
}
```

`openTab` should check if the draft is already open and just focus it rather than duplicating.

### Step 4 — Create `FlomoEditorWrapper`

A new component that replaces the full-screen overlay with an inline tabbed editor area:

```
client/src/components/flomo/editor-wrapper.tsx
```

```tsx
export function FlomoEditorWrapper() {
  const { openTabs, activeTabId, closeTab, setActiveTab } = useAppState();

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b">
        {openTabs.map((tab) => (
          <TabButton
            key={tab.draftId}
            tab={tab}
            isActive={tab.draftId === activeTabId}
            onSelect={() => setActiveTab(tab.draftId)}
            onClose={() => closeTab(tab.draftId)}
          />
        ))}
      </div>

      {/* Editor panels — mount all, show active */}
      {openTabs.map((tab) => (
        <div
          key={tab.draftId}
          className={cn("flex-1", tab.draftId !== activeTabId && "hidden")}
        >
          <FlomoEditor tab={tab} />
        </div>
      ))}
    </div>
  );
}
```

Each `FlomoEditor` wraps `SimpleEditor` with its own draft fetch and `onClose`:

> **Note:** `useTiptapV2` is a new Flomo-specific hook that reads from `flomoDatabase` (IndexedDB), distinct from the existing `useDraft` hook which calls the server REST API. It returns the same `{ content, ts }` shape.

```tsx
function FlomoEditor({ tab }: { tab: EditorTab }) {
  const { data: draft } = useTiptapV2(tab.draftId);  // local-first: reads from IndexedDB
  const { closeTab } = useAppState();

  const handleClose = useCallback(
    (_editor: Editor, _changed: boolean) => {
      closeTab(tab.draftId);
    },
    [tab.draftId],
  );

  if (!draft) return <LoadingSkeleton />;

  return (
    <SimpleEditor
      key={draft.ts}
      id={tab.draftId}
      draft={draft.content}
      ts={draft.ts}
      showToast={false}
      removeCache={false}
      onClose={handleClose}
    />
  );
}
```

### Step 5 — Update `NavTabs` sidebar section

Replace the current placeholder content in `NavTabs` with the actual list of open tabs:

```tsx
export function NavTabs() {
  const { openTabs, activeTabId, setActiveTab, closeTab } = useAppState();

  return (
    <SidebarMenu>
      {openTabs.map((tab) => (
        <SidebarMenuItem key={tab.draftId}>
          <SidebarMenuButton
            isActive={tab.draftId === activeTabId}
            onClick={() => setActiveTab(tab.draftId)}
          >
            <span className="truncate">{tab.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
```

### Step 6 — Wire up card opening

When a user clicks a card in `NavCards`, call `openTab`:

```typescript
const handleCardClick = (card: Card) => {
  openTab({
    cardId: card.id,
    draftId: card.draft,
    title: card.title,
  });
};
```

### Step 7 — Adapt sync for local-first drafts

The existing `SimpleEditor` calls `syncDraft` (server REST endpoint). For Flomo's local-first model, the sync path is different:

- Replace `syncDraft` / `invalidateDraftQuery` with writes to `flomoDatabase` (IndexedDB).
- The `SyncManager` will push changes to the server in the background.

Option A: Create a separate `FlomoSimpleEditor` that swaps the sync calls.
Option B: Make `SimpleEditor` accept a `syncStrategy` prop / adapter.

**Recommended: Option B** — keeps one editor component; the sync adapter is injected.

```typescript
interface SyncAdapter {
  save: (id: string, content: JSONContent) => Promise<void>;
  loadHistory: (id: string) => Promise<number[]>;
  getHistory: (id: string, ts: number) => Promise<JSONContent>;
  restoreHistory: (id: string, ts: number) => Promise<void>;
}
```

`SimpleEditorWrapper` (dashboard/journal) passes a `DashboardSyncAdapter` that wraps the existing REST calls. `FlomoEditorWrapper` passes a `FlomoSyncAdapter` that writes to `flomoDatabase`.

---

## Component Dependency Map

```
FlomoApp.tsx
  └─ Flomo.tsx
       ├─ AppSidebar
       │    ├─ NavFolders
       │    ├─ NavCards        ──(openTab)──▶ useAppState
       │    ├─ NavAdds
       │    └─ NavTabs         ◀──(openTabs)── useAppState
       └─ CardContent
            └─ FlomoEditorWrapper
                 ├─ TabBar     ◀──(openTabs / activeTabId)── useAppState
                 └─ FlomoEditor (×N, one per tab)
                      └─ SimpleEditor  (id passed as prop)
```

## Summary of Files Changed

| File | Change |
|---|---|
| `components/tiptap-templates/simple/simple-editor.tsx` | Accept `id` as prop; remove direct `useTTContext` dependency for id/open |
| `components/editor.tsx` (`SimpleEditorWrapper`) | Pass `id` prop to `SimpleEditor`; own the context cleanup logic |
| `hooks/flomo/use-app-state.ts` | Add `openTabs`, `activeTabId`, `openTab`, `closeTab`, `setActiveTab` |
| `components/flomo/editor-wrapper.tsx` | **New** — tabbed editor host for Flomo |
| `components/flomo/nav-tabs.tsx` | Replace placeholder with open-tab list |
| `components/flomo/nav-cards.tsx` | Call `openTab` on card click |
| `components/flomo/card-content.tsx` | Embed `FlomoEditorWrapper` |

No changes to `close-action-provider.tsx` — it remains in use only by Dashboard/Journal.
