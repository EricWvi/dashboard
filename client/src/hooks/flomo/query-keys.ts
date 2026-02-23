import { queryClient } from "@/lib/queryClient";
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

const notifyUI = debounce((table: string) => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP[table],
    exact: false, // Crucial: ensures sub-keys are caught
  });
}, 100);

export const triggerRefresh = (table: string) => notifyUI(table);

export const tiptapRefresh = debounce((id: string) => {
  queryClient.invalidateQueries({
    queryKey: keys.tiptaps.detail(id),
    exact: true,
  });
}, 100);
