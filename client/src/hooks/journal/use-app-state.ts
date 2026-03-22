import { create } from "zustand";

interface AppState {
  titleMap: Record<string, string>; // Map of draftId to title for quick lookup
  getTitleByDraftId: (draftId: string) => string | undefined; // Get title by draftId
  setTitleForDraft: (draftId: string, title: string) => void; // Set mapping of draftId to title
}

export const useAppState = create<AppState>((set, get) => ({
  titleMap: {},
  getTitleByDraftId: (draftId: string) => {
    const { titleMap } = get();
    return titleMap[draftId];
  },
  setTitleForDraft: (draftId: string, title: string) =>
    set((state) => ({
      titleMap: { ...state.titleMap, [draftId]: title },
    })),
}));
