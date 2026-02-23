# Flomo Development Log

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
