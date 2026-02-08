## TODO: migrate to local-first design

Read `migration/migrations.go`, the Version "v2.7.0" migration has changed to support local-first design.
Use `model.MetaFieldV2` when refactoring.

1. refactor `model/card.go` and `model/folder.go`. Update `List<model>` to use `since int64` as parameter instead.
2. create `model/tiptapv2.go`
3. `Delete` now is to change `is_deleted` to true.
4. `Full`: list all rows whose `is_deleted` is false.

handler/flomo/full.go

handler/flomo/pull.go

handler/flomo/push.go
