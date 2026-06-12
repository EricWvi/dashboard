# Architecture Decision Records

## ADR-001: Workspace Structure and Migration Strategy

**Status**: Accepted

New code lives exclusively in `crates/`, `packages/`, `apps/web/`, `apps/android/`. Legacy code (Go backend, `client/` directory) remains untouched during migration and will be removed once the new architecture is fully operational.

All Rust crate names are prefixed with `only-` (e.g., `only-core`, `only-commands`).

---

## ADR-002: Application Layer Separation — Server vs. Local

**Status**: Accepted

The codebase has two distinct application layers that do not share a command surface:

| Layer | Crate | Storage | Purpose |
|---|---|---|---|
| Server-side | `only-application` | PostgreSQL via `only-db` | Multi-user, authenticated, REST API |
| Local/client-side | `only-commands` | SQLite via `only-cache-journal` | Single-user, offline-first, Tauri Android |

They share domain types (`only-domain`, `only-sync-schema`) but have independent application logic and storage backends.

---

## ADR-003: `only-commands` Design

**Status**: Accepted

### Facade struct, no generics

`JournalCommands` owns a `JournalDb` instance directly — no trait bounds, no generics. The journal side has exactly one storage backend; generic abstraction would be ceremony without payoff. If a second implementation is needed later, refactor then.

---

## ADR-004: Sync is Independent of Commands

**Status**: Accepted

All synchronization logic (push, pull, full_sync, pending changes, sync meta, mark-as-synced) lives in `only-sync`. `only-commands` has no knowledge of synchronization.

`only-sync` depends on `only-cache-journal` directly for reading and writing sync-related data. Tauri sync commands call `only-sync` directly — they do not go through `JournalCommands`.

---

## ADR-005: No Server-Side Statistic Caching

**Status**: Accepted

The legacy `statistic` table and associated operations (`get_statistic`, `set_statistic`, `put_statistics`) are not carried forward. All statistics are computed on the app side from existing data.
