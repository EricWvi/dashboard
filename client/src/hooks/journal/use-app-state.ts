import { create } from "zustand";

interface AppState {
  entryMap: Record<string, string>; // Map of draftId to entryId for quick lookup
  getEntryIdByDraftId: (draftId: string) => string | undefined; // Get entryId by draftId
  setEntryIdForDraft: (draftId: string, entryId: string) => void; // Set mapping of draftId to entryId
}

export const useAppState = create<AppState>((set, get) => ({
  entryMap: {},
  getEntryIdByDraftId: (draftId: string) => {
    const { entryMap } = get();
    return entryMap[draftId];
  },
  setEntryIdForDraft: (draftId: string, entryId: string) =>
    set((state) => ({
      entryMap: { ...state.entryMap, [draftId]: entryId },
    })),
}));
