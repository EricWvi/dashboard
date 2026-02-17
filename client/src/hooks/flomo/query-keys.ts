import { queryClient } from "@/lib/queryClient";
import debounce from "lodash/debounce";

const keys = {
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
  },
};

export default keys;

const TABLE_MAP: Record<string, readonly unknown[]> = {
  cards: keys.cards.all,
  folders: keys.folders.all,
};

const notifyUI = debounce((table: string) => {
  queryClient.invalidateQueries({
    queryKey: TABLE_MAP[table],
    exact: false, // Crucial: ensures sub-keys are caught
  });
}, 100);

export const triggerRefresh = (table: string) => notifyUI(table);
