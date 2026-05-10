import { describe, expect, it, vi } from "vitest";
import { WebSyncClient } from "@/lib/journal/sync-client";
import { FakeJournalServer } from "./test-helpers/fake-journal-server";
import {
  createEntry,
  createStatistic,
  createTag,
  createTiptap,
  createUser,
} from "./test-helpers/factories";

function withoutSyncStatus<T extends { syncStatus: number }>(
  value: T,
): Omit<T, "syncStatus"> {
  const { syncStatus: _syncStatus, ...rest } = value;
  return rest;
}

function serverUser(user = createUser()) {
  const { key: _key, syncStatus: _syncStatus, ...rest } = user;
  return rest;
}

describe("WebSyncClient", () => {
  it("performs full sync against the fake server", async () => {
    const server = new FakeJournalServer({
      users: [{ ...serverUser(), serverVersion: 2 }],
      entries: [{ ...withoutSyncStatus(createEntry()), serverVersion: 3 }],
      tags: [{ ...withoutSyncStatus(createTag()), serverVersion: 4 }],
      tiptaps: [{ ...withoutSyncStatus(createTiptap()), serverVersion: 5 }],
      statistics: [
        { ...createStatistic({ stValue: 120 }), serverVersion: 6 },
      ],
      versionCounter: 6,
    });
    const fetchSpy = vi.fn(server.handleFetch.bind(server));
    vi.stubGlobal("fetch", fetchSpy);

    const client = new WebSyncClient();
    const result = await client.FullSync();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/journal?Action=FullSync",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.serverVersion).toBe(6);
    expect(result.entries).toHaveLength(1);
    expect(result.statistics[0]?.stValue).toBe(120);
  });

  it("returns incrementing server versions across push and pull", async () => {
    const server = new FakeJournalServer();
    vi.stubGlobal("fetch", vi.fn(server.handleFetch.bind(server)));
    const client = new WebSyncClient();

    const firstPush = await client.Push({
      entries: [createEntry({ id: "entry-a", updatedAt: 1000 })],
      tags: [createTag({ id: "tag-a", updatedAt: 1000 })],
      tiptaps: [createTiptap({ id: "tiptap-a", updatedAt: 1000 })],
    });

    expect(firstPush).toEqual({ ok: true, statusText: "OK" });

    const firstPull = await client.Pull(0);
    const firstVersion = firstPull.serverVersion;

    expect(firstPull.entries.map((entry) => entry.id)).toContain("entry-a");
    expect(firstVersion).toBeGreaterThan(0);

    await client.Push({
      entries: [createEntry({ id: "entry-a", updatedAt: 500 })],
      tags: [],
      tiptaps: [],
    });

    const stalePull = await client.Pull(firstVersion);
    expect(stalePull.entries).toHaveLength(0);
    expect(stalePull.serverVersion).toBeGreaterThanOrEqual(firstVersion);

    await client.Push({
      entries: [createEntry({ id: "entry-a", updatedAt: 2000, rawText: "newer" })],
      tags: [],
      tiptaps: [],
    });

    const secondPull = await client.Pull(firstVersion);

    expect(secondPull.serverVersion).toBeGreaterThan(firstVersion);
    expect(secondPull.entries).toHaveLength(1);
    expect(secondPull.entries[0]?.rawText).toBe("newer");
  });

  it("throws when the backend wrapper reports an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            requestId: "full-sync",
            code: 500,
            message: "boom",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const client = new WebSyncClient();

    await expect(client.FullSync()).rejects.toThrow("boom");
  });
});
