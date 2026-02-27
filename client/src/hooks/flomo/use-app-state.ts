import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import type { EditorState } from "@tiptap/pm/state";
import { create } from "zustand";

interface EditorTab {
  cardId: string;
  draftId: string;
  title: string;
  readMode: boolean;
  instance: EditorState | null;
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
  setTabReadMode: (draftId: string, readMode: boolean) => void; // toggle read/edit mode
  getCurrentInstance: () => EditorState | null; // get editor instance for a tab
  saveInstance: (draftId: string, instance: EditorState) => void; // update editor instance
  getTabById: (draftId: string) => EditorTab | undefined; // get tab by draftId
  invalidateTabInstance: (draftId: string) => void; // mark tab instance as stale, forcing reload from IndexedDB
  invalidateAllTabs: () => void; // mark all tabs as stale (for full sync)
}

export const useAppState = create<AppState>((set, get) => ({
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
  setTabReadMode: (draftId: string, readMode: boolean) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.draftId === draftId ? { ...t, readMode } : t,
      ),
    })),
  getCurrentInstance: () => {
    const { openTabs, activeTabId } = get();
    const activeTab = openTabs.find((t) => t.draftId === activeTabId);
    return activeTab ? activeTab.instance : null;
  },
  saveInstance: (draftId: string, instance: EditorState) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.draftId === draftId ? { ...t, instance } : t,
      ),
    })),
  getTabById: (draftId: string) => {
    const { openTabs } = get();
    return openTabs.find((t) => t.draftId === draftId);
  },
  invalidateTabInstance: (draftId: string) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.draftId === draftId ? { ...t, instance: null } : t,
      ),
    })),
  invalidateAllTabs: () =>
    set((state) => ({
      openTabs: state.openTabs.map((t) => ({ ...t, instance: null })),
    })),
}));
