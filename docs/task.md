# 重构任务清单

## 当前任务：`packages/ui`

提取 shadcn 基础组件库。当前组件位于 `client/src/components/ui/`，全部为纯 UI 组件，无业务逻辑。

### 前置：建立 pnpm workspace

- [x] 根目录新增 `pnpm-workspace.yaml`，声明 `packages/*` 和 `apps/**`

### 子任务

- [x] `components.json` 迁移到 packages/ui
- [x] tsc 检查 ui 包

- [x] 新建 `packages/ui/package.json`
  - name: `@only/ui`
  - exports: `./src/index.ts`、`./src/theme.css`（如有）
  - dependencies: `clsx`、`tailwind-merge`、`class-variance-authority`、`radix-ui`、`lucide-react`
  - peerDependencies: `react`、`react-dom`

- [x] 新建 `packages/ui/tsconfig.json`（参考 `example/packages/ui/tsconfig.json`）

- [x] 新建 `packages/ui/src/utils.ts`
  - 仅包含 `cn` 函数（从 `client/src/lib/utils.ts` 中提取 `cn`，其余业务函数留在原处）

- [x] 将 `client/src/components/ui/*.tsx` 全部复制到 `packages/ui/src/`
  - 更新每个文件中 `@/lib/utils` 的 import 为相对路径 `../utils`（或 `./utils`）
  - 共 32 个文件：accordion、alert-dialog、avatar、badge、breadcrumb、button、calendar、card、checkbox、collapsible、command、context-menu、dialog、dropdown-menu、hover-card、icons、input、kanban、label、popover、progress、select、separator、sheet、sidebar、skeleton、slider、sonner、table、tabs、textarea、tooltip

- [x] 新建 `packages/ui/src/index.ts`，re-export 全部组件

- [x] 在根目录 `package.json` 中更新 `components.json` 的 `aliases.ui` 指向 `@only/ui`（或在各 app 中单独配置）

---

## 下一个任务：`packages/editor`

提取 Tiptap 富文本编辑器封装。涉及文件均在 `client/src/components/tiptap-*` 和 `client/src/lib/tiptap-*.ts`。

**范围：**
- `client/src/components/tiptap-ui-primitive/` → `packages/editor/src/primitive/`（带 SCSS 样式）
- `client/src/components/tiptap-node/` → `packages/editor/src/node/`
- `client/src/components/tiptap-ui/` → `packages/editor/src/ui/`
- `client/src/components/tiptap-editor/` → `packages/editor/src/editor/`
- `client/src/components/tiptap-styles/` → `packages/editor/src/styles/`
- `client/src/components/tiptap-icons/` → `packages/editor/src/icons/`
- `client/src/lib/tiptap-utils.ts` → `packages/editor/src/utils.ts`
- `client/src/lib/tiptap-diff.ts` → `packages/editor/src/diff.ts`

**依赖：** `@only/ui`、所有 `@tiptap/*` 包
