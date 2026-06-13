# Refactoring Task List

## Current Task: `packages/editor`

Extract the Tiptap rich-text editor wrapper into a dedicated library package.
Source files are under `client/src/components/tiptap-*` and `client/src/lib/tiptap-*.ts`.

Follow the same build pattern established by `packages/ui`: tsup compiles TypeScript
to `dist/` (ESM + `.d.ts`), and `package.json` exports point to `dist/`.

### File Mapping

| Source | Target |
|--------|--------|
| `client/src/components/tiptap-ui-primitive/` | `packages/editor/src/primitive/` |
| `client/src/components/tiptap-node/` | `packages/editor/src/node/` |
| `client/src/components/tiptap-ui/` | `packages/editor/src/ui/` |
| `client/src/components/tiptap-styles/` | `packages/editor/src/styles/` |
| `client/src/components/tiptap-icons/` | `packages/editor/src/icons/` |
| `client/src/lib/tiptap-utils.ts` | `packages/editor/src/utils.ts` |
| `client/src/lib/tiptap-diff.ts` | `packages/editor/src/diff.ts` |
| `client/src/components/tiptap-editor/theme-toggle.tsx` | `packages/editor/src/editor/theme-toggle.tsx` |
| `client/src/components/tiptap-editor/simple-editor.scss` | `packages/editor/src/editor/simple-editor.scss` |

> `simple-editor.tsx` and `history-popover.tsx` contain client-side business logic
> (`useUserContextV2`, `UserLangEnum`, `useEditorState`, etc.) and stay in `client`
> for now, pending a later split.

### Subtasks

- [x] Create `packages/editor/package.json`
  - `name`: `@only/editor`
  - `exports`: `{ ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
  - `scripts`: `{ "build": "tsup", "dev": "tsup --watch" }`
  - `dependencies`: `@only/ui`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
    `@tiptap/extension-highlight`, `@tiptap/extension-horizontal-rule`,
    `@tiptap/extension-image`, `@tiptap/extension-list`, `@tiptap/extension-subscript`,
    `@tiptap/extension-superscript`, `@tiptap/extension-text-align`,
    `@tiptap/extension-typography`, `browser-image-compression`, `lodash`
  - `peerDependencies`: `react`, `react-dom`

- [x] Create `packages/editor/tsup.config.ts` (mirror `packages/ui/tsup.config.ts`; add SCSS/CSS handling via `esbuild-sass-plugin`)

- [x] Create `packages/editor/tsconfig.json` (mirror `packages/ui/tsconfig.json`)

- [x] Decouple dependencies on client internals
  - `packages/editor/src/utils.ts` has no imports from `@/lib/*`
  - `handleImageUpload` / `handleVideoUpload` / `MAX_FILE_SIZE` stay in `client/src/lib/tiptap-utils.ts`
  - `CachedImage` / `VideoExtension` accept `formatUrl?` option; `formatMediaUrl` passed from client
  - `VideoUploadButton` / `useVideoUpload` accept `upload?` callback; `handleVideoUpload` passed from client
  - `useUserContextV2` replaced by `EditorLanguageContext` (`EditorProvider` + `useEditorLanguage()`) inside package

- [x] Copy files and update import paths
  - `@/components/tiptap-ui-primitive/*` → relative paths within the package
  - `@/components/tiptap-node/*` → relative paths within the package
  - `@/components/tiptap-ui/*` → relative paths within the package
  - `@/components/tiptap-icons/*` → relative paths within the package
  - `@/lib/tiptap-utils` → `../../utils`
  - `@/lib/tiptap-diff` → `../../diff`
  - `@/lib/model` → `../../types`
  - `@/user-provider` → `../../context` (uses `useEditorLanguage()`)

- [x] Create `packages/editor/src/index.ts` — explicit named exports (avoids name conflicts from `shouldShowButton` exported by multiple ui modules)

- [x] Package builds successfully (`npx tsup` passes, DTS generated)

- [x] Add `packages/editor` build step to `install:frontend` task in `Taskfile.yml`

- [x] Update vite configs and `tsconfig.app.json` in client to resolve `@only/editor`
  - Vite alias: `"@only/editor"` → `packages/editor/src/index.ts`
  - TS path: `"@only/editor"` → `packages/editor/dist/index.d.ts`

- [x] Update `client` imports to consume from `@only/editor`
  - `simple-editor.tsx` updated: all tiptap component imports → `@only/editor`; wrapped `ReadOnlyTiptap` with `EditorProvider`; passes `formatMediaUrl` to `CachedImage`/`VideoExtension`, `handleVideoUpload` to `VideoUploadButton`
  - `history-popover.tsx` updated: `Button`, `RestoreIcon`, `diffJSONContent` from `@only/editor`
  - `theme-toggle.tsx` updated: `Button`, `MoonStarIcon`, `SunIcon` from `@only/editor`
  - `editor-provider.tsx` updated: wraps children with `<EditorProvider language={language}>`
  - `flomo/card-pane.tsx`, `journal/entry-editor.tsx`: `TableOfContents` from `@only/editor`
  - Deleted from client: `tiptap-ui/`, `tiptap-ui-primitive/`, `tiptap-node/`, `tiptap-icons/`, `hooks/use-tiptap-editor.ts`, `hooks/use-menu-navigation.ts`, `lib/tiptap-diff.ts`

- [x] Client TypeScript type check passes (`tsc --noEmit`)
- [x] Client Vite build passes (`vite build --config vite.dashboard.config.ts`)

---

## Next Task: `apps/client`

Move the `client/` directory into `apps/client` to become a proper pnpm workspace app.

**Prerequisites:** `packages/editor` complete and consumed by `client`. ✅

### Subtasks

- [ ] Move `client/` → `apps/web/client/`
- [ ] Update `pnpm-workspace.yaml` if needed (`apps/**` already matches)
- [ ] Update all root-level Taskfile references to `client/` paths
- [ ] Update Go backend static file references if they embed client build output
- [ ] Verify `pnpm install` resolves `@only/ui`, `@only/contracts`, `@only/editor`
  workspace links correctly from the new location
- [ ] Confirm `task run:web-backend` and frontend builds still work end-to-end
