# Flomo Development Log

- 2026-03-18: Refactored sidebar sorting in `nav-folders.tsx` and `nav-cards.tsx` from item-edge drop sensing to standalone inter-item `DropZone` rows (`[Zone, Item, Zone...]`). Added 12px transparent hit areas with centered 2px insertion lines, deterministic zone-based `generateKeyBetween(prevOrder, nextOrder)` sorting, and self-adjacent drop guards to avoid redundant inserts and edge flicker.
