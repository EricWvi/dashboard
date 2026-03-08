# Flomo TOC (Table of Contents) Refactoring Plan

Based on the recent developments and the discussion in the dev log, the following represents the plan to refactor the TOC implementation for Flomo. This plan focuses solely on Flomo, as dashboard and journal will be refactored separately later.

## 1. State Management: Source of Truth

- **Current Issue:** The TOC is relying too heavily on DOM queries and dealing with "ghost" headings when transactions haven't fully synced with the DOM.
- **Solution:** Pull headings exclusively from the ProseMirror Document (`state.doc`), not the DOM. The TOC UI should merely map `state.doc.descendants`.
- **Implementation:** In the `toc.tsx` component, use a React `useEffect` layout hook to synchronize with the editor's lifecycle, listening to both `transaction` and `update` events on the editor to update the React state.

## 2. Heading Identification: Tiptap Node Attributes

- **Current Issue:** ID generation might be dependent on text or index, causing TOC items to jump or flicker if a heading is edited.
- **Solution:** Assign unique IDs to the Heading node schema in Tiptap.
- **Implementation:** Create or modify a Tiptap extension to automatically generate and assign a UUID (or deterministic slug) to each heading upon creation. Ensure this `uniqueId` is persisted as a node attribute.

## 3. Intersection Detection: `IntersectionObserver`

- **Current Issue:** Scroll tracking relies on `requestAnimationFrame` (RAF) throttling, which is functionally acceptable but still fires on every scroll frame and requires complex bounding box logic.
- **Solution:** Replace RAF throttling and scroll listeners with the `IntersectionObserver` API.
- **Implementation:**
  - Define an "active zone" using `rootMargin` (e.g., `rootMargin: '0px 0px -80% 0px'`).
  - Observe all heading elements within the editor view.
  - Update the `activeId` state purely based on intersection crossing thresholds, which handles whitespace gracefully.

## 4. Scoped DOM Queries: `editor.view.dom`

- **Current Issue:** Depending on outer containers or global DOM state can lead to collisions when multiple editor instances or split-views are active.
- **Solution:** Scope all necessary DOM queries directly to the editor instance.
- **Implementation:** Instead of using `document.querySelectorAll` or complex ref-passing for scroll containers, use `editor.view.dom` as the base root for any necessary DOM interrogations (like setting up the `IntersectionObserver` targets).

## 5. UI/UX: Scroll Active TOC Item

这一条我本来就有逻辑：页面滚动时会 scrollIntoView，只有鼠标 hover 在 toc 上才能滚动 toc，鼠标一离开 toc，active item 又回 scrollIntoView。这是一个定时任务

- **Enhancement:** When the TOC list grows larger than the viewport, the currently active item might be hidden.
- **Implementation:** Implement a behavior to call `element.scrollIntoView({ block: 'nearest' })` on the active TOC link within the TOC container itself so that it remains visible as the user scrolls through the main document.
