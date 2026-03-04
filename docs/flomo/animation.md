# Flomo Sidebar Transition Animations

## Problem

When clicking a folder in the sidebar, `NavFolders` and `NavCards` re-render with new content. If the new folder has fewer (or no) sub-folders/cards, the sections collapse abruptly without any visual transition, creating a jarring experience.

Additionally, as `NavPath` grows when navigating deeper into the folder tree, `NavFolders` and `NavCards` are pushed down instantly without smooth motion.

## Plan

### 1. Content fade-in on folder change (`currentFolderId`)

**Components affected:** `NavFolders`, `NavCards`

- Wrap the inner content (the `SidebarGroup`) with a `motion.div` from `framer-motion`, keyed by `currentFolderId`.
- When `currentFolderId` changes, React unmounts the old keyed element and mounts a new one, triggering:
  - `initial={{ opacity: 0.4 }}` → `animate={{ opacity: 1 }}` with `duration: 0.3` (ease-out).
- This provides a smooth opacity transition from semi-transparent to fully opaque each time the folder changes.

### 2. Smooth push-down when `NavPath` grows

**Component affected:** `NavPath` (wrapper in `sidebar.tsx`)

- The `NavPath` component lives in `SidebarHeader`. When navigating deeper, more tree nodes are added, increasing the header height.
- Wrap the `NavPath` content in a `motion.div` with `layout` animation, or use CSS `transition` on the container's height.
- Approach chosen: apply a CSS `transition: height` on the `NavPath` wrapper using a measured-height technique, so that when path items are added/removed the height change is animated, smoothly pushing `NavFolders`/`NavCards` in `SidebarContent` down/up.
- Implementation: use a `useRef` + `ResizeObserver` to track content height, then animate via `motion.div` with `animate={{ height }}`.

## Technical Details

- **Library:** `framer-motion` (already installed)
- **Pattern:** Matches existing usage in `journal/entry-card.tsx`, `journal/header.tsx`
- **Performance:** `layout` animations and opacity transitions are GPU-accelerated, no performance concerns for sidebar usage.
