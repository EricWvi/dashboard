import { queryClient } from "@/lib/queryClient";
import { syncEvents } from "@/lib/sync-events";
import debounce from "lodash/debounce";

const keys = {
  user: {
    current: ["user"] as const,
  },
  entries: {
    all: ["entries"] as const,
    detail: (id: string) => [...keys.entries.all, "detail", id] as const,
  },
  tags: {
    all: ["tags"] as const,
  },
  tiptaps: {
    all: ["tiptaps"] as const,
    detail: (id: string) => [...keys.tiptaps.all, "detail", id] as const,
  },
  statistics: {
    all: ["statistics"] as const,
    wordsCount: () => [...keys.statistics.all, "wordsCount"] as const,
    entryDate: () => [...keys.statistics.all, "entryDate"] as const,
    currentYear: () => [...keys.statistics.all, "currentYear"] as const,
  },
};

export default keys;

const TABLE_MAP: Record<string, readonly unknown[]> = {
  entries: keys.entries.all,
  tags: keys.tags.all,
  user: keys.user.current,
  tiptaps: keys.tiptaps.all,
  statistics: keys.statistics.all,
};

// Create independent debounced functions for each table to avoid cancellation
const invalidateUser = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.user,
    exact: false,
  });
}, 100);

const invalidateEntries = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.entries,
    exact: false,
  });
}, 100);

const invalidateTags = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.tags,
    exact: false,
  });
}, 100);

const invalidateTiptaps = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.tiptaps,
    exact: false,
  });
}, 100);

const invalidateStatistics = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.statistics,
    exact: false,
  });
}, 100);

export const triggerRefresh = (table: string) => {
  switch (table) {
    case "user":
      invalidateUser();
      break;
    case "entries":
      invalidateEntries();
      break;
    case "tags":
      invalidateTags();
      break;
    case "tiptaps":
      invalidateTiptaps();
      break;
    case "statistics":
      invalidateStatistics();
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
