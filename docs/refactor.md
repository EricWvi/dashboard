# 重构分析：迁移至多 Crates / 多 Packages 架构

## 背景

当前项目是一个混合技术栈的个人仪表盘：

- **后端**：Go + Gin，单模块平铺结构（最终将完全移除）
- **前端**：单个 `client/` npm 包，同时包含三个独立应用（Dashboard、Flomo、Journal）
- **移动端**：Tauri Android 应用（`client/src-tauri/`），自带独立 Rust workspace
- **工具库**：`crates/logging`（独立 Rust crate）

目标参考架构见 `example/`，其核心设计思路是：

- Rust Workspace 管理多个 crate，分层（domain → application → db → server）
- pnpm Workspace 管理多个 TS/React package，按职责拆包

---

## 部署场景

系统有两个运行场景，共用**同一个** Rust 后端：

```
场景 A：Web（Server-Centric）
  浏览器 (React SPA)  →  Rust 后端 (Axum + PostgreSQL)
  无本地数据库，数据完全由服务端持有

场景 B：Android
  Android App (Tauri WebView + 本地 SQLite)  →  Rust 后端 (Axum + PostgreSQL)
  客户端持有本地副本，定期与服务端同步
```

- 后端唯一，提供 REST API，同时服务 Web 和 Android 客户端
- Go 后端在 Rust 后端就绪后完全移除，无需长期兼容层

---

## 数据库设计原则

| 数据库 | 位置 | 使用方 |
|--------|------|--------|
| PostgreSQL | 后端服务器 | Rust 后端独占 |
| SQLite | Android 本地 | Android app（Tauri SQLite 插件） |

**关键约定：**

- SQLite 表结构与 PG **基本一致**，字段定义对称
- `server_version` 字段**仅由后端管理**，客户端只读，用于增量同步判断
- Android 客户端本地有 `local_version` 等本地状态字段，后端不感知
- Web 无本地数据库，不存在同步问题

---

## 当前结构分析

### 后端（Go，待移除）

```
handler/
  auth/       blog/       bookmark/   collection/ dashboard/
  echo/       entry/      flomo/      journal/    media/
  tiptap/     todo/       user/       watch/
service/      # 外部服务初始化（MinIO、OIDC、Feed、Cron）
model/        # GORM 数据模型（v2）
middleware/   # JWT、CORS、日志、幂等
migration/    # SQL 迁移脚本
config/       # Viper 配置
log/          # 日志封装
```

### 前端（TypeScript）

```
client/
  src/
    pages/          # 8 个页面（Dashboard、Flomo、Journal、Todo…）
    components/     # UI 组件（dashboard、flomo、journal、tiptap-*、ui）
    hooks/          # React hooks（按应用分目录）
    lib/
      dashboard/    # sync-client、sync-manager、model、dexie（待移除）
      flomo/        # 同上
      journal/      # 同上
  vite.dashboard.config.ts
  vite.flomo.config.ts
  vite.journal.config.ts
```

**问题：**
- 三个应用混在同一个 package，构建配置靠三个 vite config 区分
- `tiptap-*` 编辑器组件跨应用共用，无法独立版本管理
- `lib/*/dexie.ts` 引入了不必要的本地 DB 层（Web 为 server-centric，应移除）
- `lib/*/sync-manager.ts` 只对 Android 有意义，不应出现在 Web 代码路径中

---

## 目标架构

```
dashboard/
├── Cargo.toml              # Rust workspace 根（不包含 Android app）
├── pnpm-workspace.yaml     # pnpm workspace 根
├── package.json
│
├── apps/
│   ├── web/
│   │   ├── server/         # Rust HTTP 服务（Axum），服务 Web 和 Android
│   │   ├── dashboard/      # React SPA - 主仪表盘
│   │   ├── flomo/          # React SPA - Flomo 笔记
│   │   └── journal/        # React SPA - 日记
│   └── android/            # Tauri Android 应用（独立 Rust workspace）
│       ├── src-tauri/      # 独立 Cargo workspace，不在根 Cargo.toml 中
│       └── src/            # Android WebView 前端代码
│
├── crates/
│   ├── domain/             # 核心实体，无外部依赖
│   ├── application/        # 用例 + Repository trait
│   ├── contracts/          # HTTP 请求/响应类型（ts-rs 生成 TS 类型）
│   ├── db/                 # Repository 实现（PostgreSQL）
│   ├── infrastructure/     # MinIO、RSS Feed、Cron、OIDC
│   └── logging/            # 现有，保持不变
│
└── packages/
    ├── contracts/          # 从 Rust contracts crate 生成的 TS 类型 + HTTP client
    ├── ui/                 # shadcn 基础组件库
    └── editor/             # Tiptap 编辑器组件（tiptap-node + tiptap-ui）
```

---

## Rust Workspace 边界

根 `Cargo.toml` 只包含服务端相关 crate：

```toml
[workspace]
members = [
    "apps/web/server",
    "crates/application",
    "crates/contracts",
    "crates/db",
    "crates/domain",
    "crates/infrastructure",
    "crates/logging",
    "xtask",
]
```

`apps/android/src-tauri/` 拥有自己独立的 `Cargo.toml [workspace]`，与根 workspace 完全隔离。Android crate 需要后端的类型时，通过 `@only/contracts` TypeScript 包（ts-rs 生成）消费，而非直接依赖 Rust crate。

---

## Rust Crate 划分

### `crates/domain` (`only-domain`)

纯领域层，不依赖任何框架和 IO。

**业务实体分组：**

| 模块 | 实体 |
|------|------|
| `user` | User |
| `todo` | Todo |
| `note` | Tiptap, QuickNote |
| `echo` | Echo |
| `collection` | Collection |
| `watch` | Watch |
| `bookmark` | Bookmark, Tag |
| `blog` | Blog |
| `entry` | Entry（日记条目） |
| `media` | Media |

每个业务实体包含：ID 类型（newtype）、状态枚举、核心字段结构体，以及 `server_version: i64` 审计字段。

### `crates/application` (`only-application`)

用例层，定义 Repository trait + Command Handler。每个业务域一个子模块。

每个域的 Repository trait 包含标准 CRUD，以及 `find_since_version(version: i64)` 用于支持 Android 客户端增量同步。

### `crates/contracts` (`only-contracts`)

对外 HTTP 合同层，Request/Response 类型。使用 `ts-rs` derive 自动生成 TypeScript 类型，输出到 `packages/contracts/src/`。

每个业务域的标准端点：
- `GET/POST/PUT/DELETE /{resource}` - 常规 CRUD
- `GET /{resource}/pull?since={version}` - 增量拉取（仅 Android 使用）
- `POST /{resource}/push` - 上传本地变更（仅 Android 使用）

### `crates/db` (`only-db`)

Repository 实现，PostgreSQL（sqlx）。负责 `server_version` 的自增管理。

### `crates/infrastructure` (`only-infrastructure`)

外部服务封装：MinIO、RSS Feed 抓取、Cron 调度、OIDC 认证。

### `apps/web/server` (`only-web-server`)

HTTP 入口，同时服务 Web SPA 和 Android 客户端：

```
src/
  main.rs
  app_state.rs   # 共享状态
  bootstrap.rs   # 初始化顺序（迁移、后台任务）
  config.rs
  routes.rs      # Web 路由 + Android 同步路由
  handlers/      # 每个域一个文件
  error.rs
```

---

## TypeScript Package 划分

Web 为 server-centric 设计，packages 层不涉及任何本地数据库或同步逻辑。

### `packages/ui` (`@only/ui`)

纯 UI 组件库，对应当前 `client/src/components/tiptap-ui-primitive/` 和 `client/src/components/ui/`。无业务逻辑，基于 shadcn/ui + Radix UI，被所有 web app 依赖。

### `packages/editor` (`@only/editor`)

Tiptap 富文本编辑器封装，对应当前：
- `client/src/components/tiptap-editor/`
- `client/src/components/tiptap-node/`
- `client/src/components/tiptap-ui/`
- `client/src/lib/tiptap-utils.ts`、`tiptap-diff.ts`

Dashboard app 和 Flomo app 共用此包。

### `packages/contracts` (`@only/contracts`)

从 Rust `crates/contracts` 通过 `ts-rs` 生成的 TypeScript 类型定义，加上 HTTP client 封装（fetch wrapper、端点常量）。Web app 和 Android app 均依赖此包。

---

## Web App 划分

三个 Web SPA 均为纯粹的 server-centric 应用：直接通过 `@only/contracts` 调用后端 API，使用 React Query 做请求缓存，无本地数据库。

| App | 路径 | 说明 |
|-----|------|------|
| 主仪表盘 | `apps/web/dashboard` | Todo、Echo、Collection、Tiptap、Bookmark、Blog、Watch |
| Flomo 笔记 | `apps/web/flomo` | Card、Folder、Search |
| 日记 | `apps/web/journal` | Entry、媒体、日历 |

---

## Android App 结构

Android app 是独立 Rust workspace，自行管理本地 SQLite 和同步逻辑，不依赖根 workspace 的任何 Rust crate。

```
apps/android/
├── src-tauri/              # 独立 Rust workspace
│   ├── Cargo.toml          # [workspace] 根，不出现在根 Cargo.toml 中
│   └── crates/
│       ├── sync/           # 同步引擎（pull/push、冲突处理、server_version 追踪）
│       └── db/             # SQLite Repository 实现
└── src/                    # WebView 前端（React）
    # 使用 @only/ui、@only/editor、@only/contracts
    # 本地 SQLite 操作通过 Tauri commands 调用 Rust 侧
```

Android 前端通过 Tauri command 与 Rust 层交互，而非直接操作数据库。同步逻辑完全在 Rust 侧实现。

---

## 渐进迁移路线

> **总原则**：新代码全部写在 `crates/`、`packages/`、`apps/web/`、`apps/android/` 中。旧代码（Go 后端、`client/` 目录）在迁移期间保持不动，待新架构完全就绪后统一删除，不做增量清理。

### 阶段一：前端拆包

1. 建立 pnpm workspace（`pnpm-workspace.yaml`）
2. 新建 `packages/ui`、`packages/editor`，将组件逐步迁入
3. 新建 `apps/web/dashboard`、`apps/web/flomo`、`apps/web/journal`，各自引用新 packages
4. 旧 `client/` 目录保持可运行，新旧并存直到新 app 稳定

### 阶段二：Rust 后端 + contracts 包

1. 建立 `crates/domain`、`crates/application`、`crates/contracts`、`crates/db`、`crates/infrastructure`
2. `crates/contracts` 通过 ts-rs 生成 `packages/contracts/src/`，`@only/contracts` 即为生成产物
3. `apps/web/server` 实现 HTTP 路由，端点与现有 Go API 保持一致
4. 整理 Android app 目录结构，建立独立 Rust workspace
5. 新 web app 接入新后端，验证所有功能正常

### 最终清理（统一执行）

- 删除根目录下所有 Go 代码（`handler/`、`service/`、`model/`、`middleware/`、`migration/`、`config/`、`log/`、`main.go`、`router.go`）
- 删除旧 `client/` 目录

---

## 关键依赖关系图

```
Rust（← 表示"被依赖"）:

domain  ←  application  ←  db
              ↑                ↑
           contracts        infrastructure
              ↑
         apps/web/server

apps/android/src-tauri  （独立 workspace，不在此图中）

TypeScript:

@only/ui  ←  @only/editor  ←  web apps
@only/contracts  ←  web apps
@only/contracts  ←  apps/android/src  （通过 Tauri command 与 Rust 侧通信）
```

---

## 命名约定

本项目统一使用 `only-` 前缀（Rust）和 `@only/` scope（TypeScript）：

| Crate 目录 | package name |
|-----------|--------------|
| `crates/domain` | `only-domain` |
| `crates/application` | `only-application` |
| `crates/contracts` | `only-contracts` |
| `crates/db` | `only-db` |
| `crates/infrastructure` | `only-infrastructure` |
| `crates/logging` | `only-logging` |

| package 目录 | name |
|-------------|------|
| `packages/ui` | `@only/ui` |
| `packages/editor` | `@only/editor` |
| `packages/contracts` | `@only/contracts` |
