# Flomo Development Log

## 2026-02-23: Archive mode visual decorations

Added warm-toned wavy SVG decorations to the sidebar header and card header when archive mode is active, providing a clear visual cue that the user is browsing archived content.

**Files changed:**
- `client/src/components/flomo/archive-decoration.tsx` — New file with `SidebarArchiveWave` and `HeaderArchiveWave` components
- `client/src/components/flomo/sidebar.tsx` — Conditionally renders `SidebarArchiveWave` inside `SidebarHeader` when `isArchiveMode` is true
- `client/src/components/flomo/card-header.tsx` — Renders `HeaderArchiveWave` at the bottom edge of the header in archive mode

**Design notes:**
- Two overlapping wavy curves in the sidebar (amber-600 + yellow-700) for a ribbon-like effect
- Single wavy curve in the card header for subtlety
- Colors use warm amber/yellow tones matching the existing `text-yellow-700 dark:text-yellow-600` palette
- Reduced opacity ensures harmony with both light and dark backgrounds
- Decorations are hidden via `aria-hidden="true"` for accessibility
