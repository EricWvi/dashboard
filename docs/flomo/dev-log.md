# Flomo Development Log

## 2026-03-08 — Refactor TOC: implement TOCExtensionV2 with stable runtime IDs

### Goal

Refactor the underlying TOC ProseMirror plugin so that:
1. Heading IDs are stable across transactions (no positional shifting when text is added/removed around headings).
2. All TOC logic is decoration-only at runtime — nothing is written into the document JSON.
3. Current TOC style (toc.scss) and interaction logic (toc.tsx) are unchanged.

### Implementation

- **`toc-extension-v2.ts`** (new): `TOCExtensionV2` extension with a new plugin key `tocV2PluginKey`.  
  - Maintains an in-memory `idMap: Map<number, string>` (position → stable ID) in plugin state.  
  - On `apply`, maps old positions through `tr.mapping` to carry stable IDs to their new positions;  only newly-created headings get a fresh `nextId()` counter value.  
  - `apply` short-circuits with `if (!tr.docChanged) return old` to avoid unnecessary rebuilds.  
  - Exports `getTOCItemsV2` and `getScrollBehaviorV2` helpers (same API shape as V1).  
  - `scrollBehavior` is stored in extension `storage`, not plugin state.
- **`toc.tsx`**: Added auto-detection helpers (`isV2Active`, `getItems`, `getBehavior`) that prefer V2 when its plugin is registered, falling back to V1 — ensuring full backward-compatibility for dashboard/journal (which still use `TOCExtension` V1).
- **`simple-editor.tsx`** (flomo): Switched from `TOCExtension` to `TOCExtensionV2`.
- **`index.ts`**: Exports `TOCExtensionV2`, `getTOCItemsV2`, `getScrollBehaviorV2` alongside the existing V1 exports.

## 2026-03-08 — Fix TOC in card pane layout

### Problem

The Table of Contents extension had four issues in the new non-fullscreen card pane layout:

1. TOC didn't load when opening a card in read-only mode (required clicking content first)
2. TOC scrolled with editor content instead of staying fixed relative to the card pane
3. Active heading was stuck on the first item, causing unintended scroll jumps
4. Switching cards didn't refresh the TOC

### Root Causes

- **Plugin init empty**: `TOCExtension`'s ProseMirror plugin `init()` returned empty items/decorations. Only `apply()` (on transactions) populated them. Since `editor.view.updateState()` doesn't dispatch transactions, newly loaded content had no TOC data.
- **No event after state load**: `EditorState` component calls `updateState` + `setEditable(false)` without generating any editor events, so the TOC component never got notified.
- **CSS conflict**: The `.tiptap-toc` SCSS set `position: fixed` which overrode Tailwind utility classes. `fixed` was also broken by ancestor `transform` properties in the sidebar layout.
- **Global DOM queries**: `document.querySelectorAll` for headings wasn't scoped to the scroll container.

### Changes

- **`toc-extension.ts`**: Extracted `buildTOCState()` helper. Both `init(_, state)` and `apply(tr)` now use it, so fresh states have correct items and decorations immediately.
- **`toc.tsx`**: Major refactoring:
  - Added `className` prop for consumer-controlled positioning (default: fixed for dashboard; absolute for Flomo)
  - Replaced 500ms polling with scroll-event-based active heading tracking (RAF-throttled)
  - Added retry mechanism (up to 2s) for async content loads from IndexedDB
  - Used `activeIdRef` to avoid stale closure issues
  - Scoped heading queries to the scroll container (not global `document`)
  - Removed hardcoded `style={{ position: "fixed" }}`
  - Show items at 0.6 opacity when no heading has crossed the threshold yet
- **`card-pane.tsx`**: Wrapped scroll container and TOC in a `relative` parent; pass `FLOMO_TOC_CLASS` with `absolute` positioning.
- **`toc.scss`**: Removed `position: fixed` and related layout rules (now controlled by Tailwind); removed `@media` responsive rule (now handled by Tailwind's `hidden xl:block`).
