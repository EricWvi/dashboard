import { SyncStatus, type Tag, type TiptapV2, type User } from "@/lib/model";
import type { Entry, Statistic } from "@/lib/journal/model";

export function createUser(overrides: Partial<User> = {}): User {
  return {
    key: "current_user",
    username: "tester",
    email: "tester@example.com",
    avatar: "",
    language: "en-US",
    updatedAt: 1000,
    syncStatus: SyncStatus.Synced,
    ...overrides,
  };
}

export function createEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "entry-1",
    draft: "draft-1",
    payload: { tags: ["tag-1"] },
    wordCount: 120,
    rawText: "hello world",
    bookmark: false,
    createdAt: 1000,
    updatedAt: 1000,
    isDeleted: false,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

export function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: "tag-1",
    name: "tag",
    createdAt: 1000,
    updatedAt: 1000,
    isDeleted: false,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

export function createTiptap(overrides: Partial<TiptapV2> = {}): TiptapV2 {
  return {
    id: "tiptap-1",
    content: { type: "doc", content: [] },
    history: [],
    createdAt: 1000,
    updatedAt: 1000,
    isDeleted: false,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

export function createStatistic(
  overrides: Partial<Statistic> = {},
): Statistic {
  return {
    stKey: "wordsCount",
    stValue: 120,
    ...overrides,
  };
}
