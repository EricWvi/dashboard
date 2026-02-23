import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import { create } from "zustand";

interface EditorTab {
  cardId: string;
  draftId: string;
  title: string;
  readMode: boolean;
}

interface AppState {
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;

  isArchiveMode: boolean;
  enterArchiveMode: () => void;
  exitArchiveMode: () => void;

  // Editor tabs
  openTabs: EditorTab[];
  activeTabId: string | null; // draftId of focused tab
  openTab: (tab: EditorTab) => void; // add or focus existing tab
  closeTab: (draftId: string) => void; // remove tab
  setActiveTab: (draftId: string) => void; // switch focus
}

export const useAppState = create<AppState>((set) => ({
  currentFolderId: RootFolderId,
  setCurrentFolderId: (id: string) => set(() => ({ currentFolderId: id })),

  isArchiveMode: false,
  enterArchiveMode: () =>
    set(() => ({ isArchiveMode: true, currentFolderId: ArchiveFolderId })),
  exitArchiveMode: () =>
    set(() => ({ isArchiveMode: false, currentFolderId: RootFolderId })),

  openTabs: [],
  activeTabId: null,
  openTab: (tab: EditorTab) =>
    set((state) => {
      const existingTab = state.openTabs.find((t) => t.draftId === tab.draftId);
      if (existingTab) {
        return { activeTabId: existingTab.draftId }; // Focus existing tab
      }
      return {
        openTabs: [...state.openTabs, tab],
        activeTabId: tab.draftId,
      };
    }),
  closeTab: (draftId: string) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.draftId !== draftId);
      const isActiveClosed = state.activeTabId === draftId;
      return {
        openTabs: newTabs,
        activeTabId: isActiveClosed
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].draftId // Focus last tab if active closed
            : null
          : state.activeTabId,
      };
    }),
  setActiveTab: (draftId: string) => set(() => ({ activeTabId: draftId })),
}));
