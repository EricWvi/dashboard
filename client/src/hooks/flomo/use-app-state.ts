import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import { create } from "zustand";

interface AppState {
  // Navigation
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;

  isArchiveMode: boolean;
  enterArchiveMode: () => void;
  exitArchiveMode: () => void;

  cardMap: Record<string, string>; // Map of draftId to cardId for quick lookup
  getCardIdByDraftId: (draftId: string) => string | undefined; // Get cardId by draftId
  setCardIdForDraft: (draftId: string, cardId: string) => void; // Set mapping of draftId to cardId
}

export const useAppState = create<AppState>((set, get) => ({
  currentFolderId: RootFolderId,
  setCurrentFolderId: (id: string) => set(() => ({ currentFolderId: id })),

  isArchiveMode: false,
  enterArchiveMode: () =>
    set(() => ({ isArchiveMode: true, currentFolderId: ArchiveFolderId })),
  exitArchiveMode: () =>
    set(() => ({ isArchiveMode: false, currentFolderId: RootFolderId })),

  cardMap: {},
  getCardIdByDraftId: (draftId: string) => {
    const { cardMap } = get();
    return cardMap[draftId];
  },
  setCardIdForDraft: (draftId: string, cardId: string) =>
    set((state) => ({
      cardMap: { ...state.cardMap, [draftId]: cardId },
    })),
}));
