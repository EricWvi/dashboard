# Flomo Development Log

## 2026-03-04: Sidebar transition animations for folder navigation

Added smooth transition animations to `NavFolders`, `NavCards`, and `NavPath` to eliminate jarring visual collapses when navigating between folders.

**Files changed:**
- `client/src/components/flomo/nav-folders.tsx` — Wrapped `SidebarMenu` content in `AnimatePresence` + `motion.div` keyed by `currentFolderId`. On folder change, content fades from 40% to 100% opacity over 300ms (easeOut).
- `client/src/components/flomo/nav-cards.tsx` — Same opacity fade-in animation as `NavFolders`, keyed by `currentFolderId`.
- `client/src/components/flomo/nav-path.tsx` — Wrapped tree content in `motion.div` with animated height via `ResizeObserver`. When the path grows/shrinks (e.g. navigating deeper), the container height animates over 250ms (easeOut), smoothly pushing `NavFolders`/`NavCards` down or up.

**Design notes:**
- Uses `framer-motion` (already installed) for all animations, matching existing patterns in `journal/` components.
- `NavPath` uses a callback ref + `ResizeObserver` to measure content height, then `motion.div animate={{ height }}` to animate. This handles dynamic tree node additions/removals.
- `NavFolders`/`NavCards` use `AnimatePresence mode="wait"` with `key={currentFolderId}` so that changing folders triggers a new mount with the opacity entrance animation.
- Both archive mode and normal mode branches are animated.

## 2026-02-23: Move folder path navigation from CardHeader to NavPath

Extracted the breadcrumb/path navigation out of `CardHeader` and into a dedicated `NavPath` sidebar component.

**Files changed:**
- `client/src/components/flomo/nav-path.tsx` — New component: renders the folder ancestry as a vertical tree with connected nodes (lines + circles). Supports both normal and archive-mode paths via `useFolderPath`. Each node is clickable (`setCurrentFolderId`).
- `client/src/components/flomo/card-header.tsx` — Removed breadcrumb rendering, `useFolderPath`, and related imports. Header now only contains the sidebar trigger and separator.
- `client/src/components/flomo/sidebar.tsx` — Added `NavPath` above `NavFolders` in the sidebar content area.

**Design notes:**
- Path is now displayed inside the sidebar as a tree rather than a horizontal breadcrumb in the top bar, keeping the header minimal.
- `TreeNode` component draws a vertical connecting line, a horizontal branch line, and a circle indicator; the current folder's circle uses `border-primary`.
- Archive mode trims the path to start from the nearest archived ancestor, mirroring the previous breadcrumb behaviour.

## 2026-02-23: Archive mode visual decorations

Added a warm-toned frame overlay around the entire viewport when archive mode is active, providing a clear visual cue that the user is browsing archived content.

**Files changed:**
- `client/src/components/flomo/archive-decoration.tsx` — New file with `ArchiveFrame` component using box-shadow cutout technique
- `client/src/pages/Flomo.tsx` — Conditionally renders `ArchiveFrame` when `isArchiveMode` is true
- `client/src/index.css` — Added `--archive-frame` CSS variable for light/dark theme colors

**Design notes:**
- Full-viewport fixed overlay with `pointer-events-none` (no layout shift, no interaction blocking)
- Box-shadow cutout technique: inner `div` at `inset-1` (4px) with `rounded-lg` casts a 9999px outward shadow, creating a colored frame with inner rounded corners and straight outer edges
- Colors via `--archive-frame` CSS variable: `rgba(180, 83, 9, 0.13)` for light, `rgba(217, 119, 6, 0.10)` for dark
- `aria-hidden="true"` for accessibility
- `sidebar.tsx` and `card-header.tsx` remain untouched
