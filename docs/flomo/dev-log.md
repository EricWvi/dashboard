# Flomo Development Log

- 2026-03-19: Expanded sidebar sorting `DropZone` hit area from 4px (`h-1`) to 8px (`h-2`) in both `nav-folders.tsx` and `nav-cards.tsx` to improve drag-and-drop sensitivity while keeping the 2px centered insertion line unchanged.
- 2026-03-19: Kept DropZone visual height at 4px (`h-1`) per review feedback, and switched to an absolute 8px transparent sensor layer inside each zone for better drag-and-drop hit detection without changing sidebar layout spacing.
