# Flomo Development Log

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
