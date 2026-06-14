# Refactoring Task List

## Current Task: `apps/journal`

Extract the journal feature out of `client/` into a standalone pnpm workspace app
(`apps/web/journal/`) backed by a dedicated library package (`packages/journal`).
`client/` stays in place; only journal-specific files are moved out.

**Prerequisites:** `packages/editor` complete and consumed by `client`. ✅

### File Mapping

| Source | Target |
|--------|--------|
| `client/src/components/journal/` | `packages/journal/src/components/` |
| `client/src/hooks/journal/` | `packages/journal/src/hooks/` |
| `client/src/lib/journal/` | `packages/journal/src/lib/` |
| `client/src/pages/Journal.tsx` | `packages/journal/src/pages/journal.tsx` |
| `client/journal.html` | `apps/web/journal/index.html` |
| `client/vite.journal.config.ts` | `apps/web/journal/vite.config.ts` |

> `packages/journal/src/app-shell.tsx` was renamed from `client/src/App.tsx` but still
> uses `@/` imports; decoupling is the primary remaining work.

### Subtasks

- [x] Create `apps/web/journal/` entry point (index.html, src/main.tsx, src/index.css)
- [x] Create `packages/journal/package.json`, `tsconfig.json`, `src/index.ts`, `src/app-shell.tsx`

- [ ] Complete `packages/journal/package.json`
  - `name`: `@only/journal`
  - `exports`: `{ ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
  - `scripts`: `{ "build": "tsup", "dev": "tsup --watch" }`
  - `dependencies`: `@only/editor`, `@only/ui`, `@only/contracts`, `@tanstack/react-query`,
    `dexie`, `swiper`, `odometer`, `browser-image-compression`
  - `peerDependencies`: `react`, `react-dom`

- [ ] Create `packages/journal/tsup.config.ts` (mirror `packages/editor/tsup.config.ts`)

- [ ] Move journal source files from `client/` into `packages/journal/src/`
  - `client/src/components/journal/` → `packages/journal/src/components/`
  - `client/src/hooks/journal/` → `packages/journal/src/hooks/`
  - `client/src/lib/journal/` → `packages/journal/src/lib/`
  - `client/src/pages/Journal.tsx` → `packages/journal/src/pages/journal.tsx`

- [ ] Decouple from client internals
  - `lib/journal/model.ts`: replace `@/lib/model` import with types from `@only/contracts`
    or define locally in `packages/journal/src/types.ts`
  - `app-shell.tsx`: replace all `@/` imports with package-relative paths
    - `@/lib/queryClient` → local `lib/query-client.ts`
    - `@/hooks/journal/*` → `./hooks/*`
    - `@/lib/journal/*` → `./lib/*`
    - `@/pages/Journal` → `./pages/journal`
    - `@/user-provider` → `@only/ui` or local context
    - `@/editor-provider` → `@only/editor` (`EditorProvider`)
    - `@/components/overlay-controller` → `./components/overlay-controller`
    - `@/components/editor` → `@only/editor` (`TTOverlayProvider`)

- [ ] Update `apps/web/journal/src/main.tsx`
  - Replace `import App from "./App.tsx"` with `import { AppShell } from "@only/journal"`
  - Ensure `initMediaServerBaseUrl` is either inlined or imported from a shared util

- [ ] Create `apps/web/journal/vite.config.ts` (adapt from `client/vite.journal.config.ts`;
  update aliases to resolve `@only/journal`, `@only/editor`, `@only/ui`, `@only/contracts`)

- [ ] Create `apps/web/journal/package.json` and `tsconfig.json`

- [ ] Remove journal files from `client/` after migration:
  - `client/src/components/journal/`
  - `client/src/hooks/journal/`
  - `client/src/lib/journal/`
  - `client/src/pages/Journal.tsx`
  - `client/vite.journal.config.ts`
  - `client/journal.html`
  - `client/public-journal/`

- [ ] Add `packages/journal` build step to `Taskfile.yml`; add `apps/web/journal` dev/build scripts

- [ ] Update Go backend to serve `apps/web/journal` build output for journal routes

- [ ] `packages/journal` builds successfully (`npx tsup` passes, DTS generated)

- [ ] `apps/web/journal` builds successfully (`vite build` passes)

---

## Future Task: `apps/dashboard`

Extract the dashboard SPA from `client/` into a standalone pnpm workspace app
(`apps/web/dashboard/`). By this point `client/` contains only dashboard-specific code
(components, hooks, lib for Blog, Bookmark, Echo, Flomo, Journey, Todo, and the main
Dashboard page) after journal has been extracted.

**Prerequisites:** `apps/journal` complete.

### File Mapping

| Source | Target |
|--------|--------|
| `client/src/components/dashboard/` | `apps/web/dashboard/src/components/dashboard/` |
| `client/src/components/echo/` | `apps/web/dashboard/src/components/echo/` |
| `client/src/components/flomo/` | `apps/web/dashboard/src/components/flomo/` |
| `client/src/components/todo/` | `apps/web/dashboard/src/components/todo/` |
| `client/src/lib/flomo/` | `apps/web/dashboard/src/lib/flomo/` |
| `client/src/pages/` (non-Journal) | `apps/web/dashboard/src/pages/` |
| `client/src/hooks/` (non-journal) | `apps/web/dashboard/src/hooks/` |
| `client/vite.dashboard.config.ts` | `apps/web/dashboard/vite.config.ts` |
| `client/index.html` | `apps/web/dashboard/index.html` |

### Subtasks

- [ ] Create `apps/web/dashboard/` with `package.json`, `tsconfig.json`, `index.html`
- [ ] Move dashboard source files out of `client/` into `apps/web/dashboard/src/`
- [ ] Create `apps/web/dashboard/vite.config.ts` (adapt from `client/vite.dashboard.config.ts`;
  update aliases for `@only/ui`, `@only/contracts`, `@only/editor`)
- [ ] Update all `@/` import aliases to resolve correctly from the new location
- [ ] Update Go backend static file embeds to point to `apps/web/dashboard` build output
- [ ] Update all root-level Taskfile references to `client/` paths that pertain to dashboard
- [ ] `apps/web/dashboard` builds successfully (`vite build` passes)
- [ ] Confirm `task run:web-backend` works end-to-end
