import type { WatchStatus } from "@/lib/dashboard/model";
import { queryClient } from "@/lib/queryClient";
import { syncEvents } from "@/lib/sync-events";
import debounce from "lodash/debounce";

const keys = {
  user: {
    current: ["user"] as const,
  },
  tags: {
    all: ["tags"] as const,
  },
  blogs: {
    all: ["blogs"] as const,
    detail: (id: string) => [...keys.blogs.all, "detail", id] as const,
  },
  bookmarks: {
    all: ["bookmarks"] as const,
    detail: (id: string) => [...keys.bookmarks.all, "detail", id] as const,
  },
  collections: {
    all: ["collections"] as const,
    detail: (id: string) => [...keys.collections.all, "detail", id] as const,
  },
  echoes: {
    all: ["echoes"] as const,
    detail: (id: string) => [...keys.echoes.all, "detail", id] as const,
    year: (type: string, year: number) =>
      [...keys.echoes.all, "type", type, "year", year] as const,
    question: (type: string, sub: number) =>
      [...keys.echoes.all, "type", type, "question", sub] as const,
    years: (type: string) =>
      [...keys.echoes.all, "type", type, "years"] as const,
  },
  quickNotes: {
    all: ["quickNotes"] as const,
    detail: (id: string) => [...keys.quickNotes.all, "detail", id] as const,
  },
  todos: {
    all: ["todos"] as const,
    detail: (id: string) => [...keys.todos.all, "detail", id] as const,
    inCollection: (collectionId: string) =>
      [...keys.todos.all, "collection", collectionId] as const,
    completedInCollection: (collectionId: string) =>
      [...keys.todos.all, "completed", "collection", collectionId] as const,
    today: () => [...keys.todos.all, "today"] as const,
  },
  watches: {
    all: ["watches"] as const,
    ofStatus: (status: WatchStatus) => [...keys.watches.all, status] as const,
    detail: (id: string) => [...keys.watches.all, "detail", id] as const,
  },
  tiptaps: {
    all: ["tiptaps"] as const,
    detail: (id: string) => [...keys.tiptaps.all, "detail", id] as const,
  },
};

export default keys;

const TABLE_MAP: Record<string, readonly unknown[]> = {
  user: keys.user.current,
  tags: keys.tags.all,
  blogs: keys.blogs.all,
  bookmarks: keys.bookmarks.all,
  collections: keys.collections.all,
  echoes: keys.echoes.all,
  quickNotes: keys.quickNotes.all,
  todos: keys.todos.all,
  watches: keys.watches.all,
  tiptaps: keys.tiptaps.all,
};

const invalidateUser = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.user,
    exact: false,
  });
}, 100);

const invalidateTags = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.tags,
    exact: false,
  });
}, 100);

const invalidateBlogs = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.blogs,
    exact: false,
  });
}, 100);

const invalidateBookmarks = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.bookmarks,
    exact: false,
  });
}, 100);

const invalidateCollections = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.collections,
    exact: false,
  });
}, 100);

const invalidateEchoes = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.echoes,
    exact: false,
  });
}, 100);

const invalidateQuickNotes = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.quickNotes,
    exact: false,
  });
}, 100);

const invalidateTodos = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.todos,
    exact: false,
  });
}, 100);

const invalidateWatches = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.watches,
    exact: false,
  });
}, 100);

const invalidateTiptaps = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.tiptaps,
    exact: false,
  });
}, 100);

export const triggerRefresh = (table: string) => {
  switch (table) {
    case "user":
      invalidateUser();
      break;
    case "tags":
      invalidateTags();
      break;
    case "blogs":
      invalidateBlogs();
      break;
    case "bookmarks":
      invalidateBookmarks();
      break;
    case "collections":
      invalidateCollections();
      break;
    case "echoes":
      invalidateEchoes();
      break;
    case "quickNotes":
      invalidateQuickNotes();
      break;
    case "todos":
      invalidateTodos();
      break;
    case "watches":
      invalidateWatches();
      break;
    case "tiptaps":
      invalidateTiptaps();
      break;
  }
};

const tiptapDebounceMap = new Map<string, ReturnType<typeof debounce>>();

export const tiptapRefresh = (id: string) => {
  if (!tiptapDebounceMap.has(id)) {
    tiptapDebounceMap.set(
      id,
      debounce((tiptapId: string) => {
        syncEvents.emit(tiptapId);
      }, 100),
    );
  }

  const debounced = tiptapDebounceMap.get(id)!;
  debounced(id);
};
