**总原则**：新代码全部写在 `crates/`、`packages/`、`apps/web/`、`apps/android/` 中。旧代码（Go 后端、`client/` 目录）在迁移期间保持不动，待新架构完全就绪后统一删除，不做增量清理。
