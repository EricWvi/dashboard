# 重构任务清单

## 当前任务：`packages/editor`

提取 Tiptap 富文本编辑器封装。涉及文件均在 `client/src/components/tiptap-*` 和 `client/src/lib/tiptap-*.ts`。

### 范围映射

| 来源 | 目标 |
|------|------|
| `client/src/components/tiptap-ui-primitive/` | `packages/editor/src/primitive/` |
| `client/src/components/tiptap-node/` | `packages/editor/src/node/` |
| `client/src/components/tiptap-ui/` | `packages/editor/src/ui/` |
| `client/src/components/tiptap-styles/` | `packages/editor/src/styles/` |
| `client/src/components/tiptap-icons/` | `packages/editor/src/icons/` |
| `client/src/lib/tiptap-utils.ts` | `packages/editor/src/utils.ts` |
| `client/src/lib/tiptap-diff.ts` | `packages/editor/src/diff.ts` |
| `client/src/components/tiptap-editor/theme-toggle.tsx` | `packages/editor/src/editor/theme-toggle.tsx` |
| `client/src/components/tiptap-editor/simple-editor.scss` | `packages/editor/src/editor/simple-editor.scss` |

> `simple-editor.tsx` 和 `history-popover.tsx` 含客户端业务逻辑（`useUserContextV2`、`UserLangEnum`、`useEditorState` 等），**暂留在 client**，待后续拆分。

### 子任务

- [ ] 新建 `packages/editor/package.json`
  - name: `@only/editor`
  - exports: `./src/index.ts`
  - dependencies: `@only/ui`、`@tiptap/react`、`@tiptap/pm`、`@tiptap/starter-kit`、`@tiptap/extensions`、`@tiptap/extension-highlight`、`@tiptap/extension-horizontal-rule`、`@tiptap/extension-image`、`@tiptap/extension-list`、`@tiptap/extension-subscript`、`@tiptap/extension-superscript`、`@tiptap/extension-text-align`、`@tiptap/extension-typography`、`browser-image-compression`、`lodash`
  - peerDependencies: `react`、`react-dom`

- [ ] 新建 `packages/editor/tsconfig.json`（参考 `packages/ui/tsconfig.json`，添加 SCSS 相关配置）

- [ ] 解耦 `tiptap-utils.ts` 中对 `mediaServerBaseUrl` 的硬编码依赖
  - 将 `handleImageUpload` / `handleVideoUpload` 改为接受 `uploadUrl: string` 参数
  - 使 `packages/editor/src/utils.ts` 不再 import 任何 `@/lib/*`

- [ ] 复制文件并更新 import 路径
  - `@/components/tiptap-ui-primitive/*` → `../primitive/*`（或对应相对路径）
  - `@/components/tiptap-node/*` → `../node/*`
  - `@/components/tiptap-ui/*` → `../ui/*`
  - `@/components/tiptap-icons/*` → `../icons/*`
  - `@/lib/tiptap-utils` → `../utils`（或 `./utils`）
  - `@/lib/tiptap-diff` → `../diff`
  - `@/components/ui/*` → `@only/ui`（仅 `theme-toggle.tsx` 有此依赖）

- [ ] 新建 `packages/editor/src/index.ts`，re-export 全部组件

- [ ] tsc 检查 editor 包

- [ ] 更新 client 中对上述文件的 import，改为从 `@only/editor` 引入
  - `simple-editor.tsx` 和 `history-popover.tsx` 保留原路径引用不变（暂不迁移）
  - 其余消费方更新为 `@only/editor`

---

## 下一个任务：`apps/client`（待定）

将 `client/` 目录迁移为 `apps/client`（pnpm workspace app），
依赖 `@only/ui` 和 `@only/editor`，完成 workspace 整体联通。
