import { queryClient } from "@/lib/queryClient";
import { syncEvents } from "@/lib/sync-events";
import debounce from "lodash/debounce";

const keys = {
  user: {
    current: ["user"] as const,
  },
  cards: {
    all: ["cards"] as const,
    inFolder: (folderId: string) =>
      [...keys.cards.all, "list", { folderId }] as const,
    detail: (id: string) => [...keys.cards.all, "detail", id] as const,
  },
  folders: {
    all: ["folders"] as const,
    detail: (id: string) => [...keys.folders.all, "detail", id] as const,
    subFolders: (parentId: string) =>
      [...keys.folders.all, "list", parentId] as const,
    path: (folderId: string) =>
      [...keys.folders.all, "path", folderId] as const,
  },
  tiptaps: {
    all: ["tiptaps"] as const,
    detail: (id: string) => [...keys.tiptaps.all, "detail", id] as const,
  },
};

export default keys;

const TABLE_MAP: Record<string, readonly unknown[]> = {
  cards: keys.cards.all,
  folders: keys.folders.all,
  user: keys.user.current,
  tiptaps: keys.tiptaps.all,
};

// Create independent debounced functions for each table to avoid cancellation
const invalidateUser = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.user,
    exact: false,
  });
}, 100);

const invalidateCards = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.cards,
    exact: false,
  });
}, 100);

const invalidateFolders = debounce(() => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP.folders,
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
    case "cards":
      invalidateCards();
      break;
    case "folders":
      invalidateFolders();
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
