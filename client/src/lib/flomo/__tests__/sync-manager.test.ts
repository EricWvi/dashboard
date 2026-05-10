import { describe, expect, it, vi } from "vitest";
import { SchemaVersion } from "@/lib/flomo/model";
import { SyncManager } from "@/lib/flomo/sync-manager";
import type { IFlomoDatabase } from "@/lib/flomo/db-interface";
import type { ISyncClient } from "@/lib/flomo/sync-client";

function createMockDb(
  schemaValue: number | string | undefined,
): Pick<IFlomoDatabase, "getLastServerVersion" | "getSyncMeta"> {
  return {
    getLastServerVersion: vi.fn().mockResolvedValue(5),
    getSyncMeta: vi.fn().mockResolvedValue(
      schemaValue === undefined
        ? undefined
        : {
            key: "schemaVersion",
            value: schemaValue,
          },
    ),
  };
}

describe("Flomo SyncManager needFullSync", () => {
  it("returns true when schemaVersion is missing", async () => {
    const manager = new SyncManager(
      createMockDb(undefined) as IFlomoDatabase,
      {} as ISyncClient,
    );

    await expect(manager.needFullSync()).resolves.toBe(true);
  });

  it("returns false when schemaVersion matches as a string", async () => {
    const manager = new SyncManager(
      createMockDb(String(SchemaVersion)) as IFlomoDatabase,
      {} as ISyncClient,
    );

    await expect(manager.needFullSync()).resolves.toBe(false);
  });
});
