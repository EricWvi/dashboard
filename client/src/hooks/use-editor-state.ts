import type { EditorState } from "@tiptap/pm/state";
import { create } from "zustand";

export interface EditorTab {
  draftId: string;
  title: string;
  editable: boolean;
  cardId?: string;
}

interface TabState {
  openTabs: EditorTab[];
  activeTabId: string | null; // draftId of focused tab
  openTab: (tab: EditorTab) => void; // add or focus existing tab
  closeTab: (draftId: string) => void; // remove tab
  setActiveTab: (draftId: string) => void; // switch focus
  getTabById: (draftId: string) => EditorTab | undefined; // get tab by draftId
  getTabEditable: (draftId: string) => boolean; // get read/edit mode for a tab
  setTabEditable: (draftId: string, editable: boolean) => void; // toggle read/edit mode

  instanceMap: Record<string, EditorState | null>; // Map of draftId to editor instance
  getCurrentInstance: () => EditorState | null; // get editor instance for a tab
  invalidateTabInstance: (draftId: string) => void; // mark tab instance as stale, forcing reload from IndexedDB
  saveInstance: (draftId: string, instance: EditorState) => void; // update editor instance
  invalidateAllTabs: () => void; // mark all tabs as stale (for full sync)

  initialContentMap: Record<string, Record<string, unknown> | null>; // Map of draftId to initial content
  setInitialContent: (
    draftId: string,
    content: Record<string, unknown>,
  ) => void; // set initial content for a tab (used when opening a card)
  getInitialContent: (draftId: string) => Record<string, unknown> | null; // get initial content for a tab
}

export const useEditorState = create<TabState>((set, get) => ({
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
      const newInstanceMap = { ...state.instanceMap };
      delete newInstanceMap[draftId];
      const newInitialContentMap = { ...state.initialContentMap };
      delete newInitialContentMap[draftId];

      const isActiveClosed = state.activeTabId === draftId;
      return {
        openTabs: newTabs,
        instanceMap: newInstanceMap,
        initialContentMap: newInitialContentMap,
        activeTabId: isActiveClosed
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].draftId // Focus last tab if active closed
            : null
          : state.activeTabId,
      };
    }),
  setActiveTab: (draftId: string) => set(() => ({ activeTabId: draftId })),
  getTabById: (draftId: string) => {
    const { openTabs } = get();
    return openTabs.find((t) => t.draftId === draftId);
  },
  getTabEditable: (draftId: string) => {
    const tab = get().getTabById(draftId);
    return tab ? tab.editable : false;
  },
  setTabEditable: (draftId: string, editable: boolean) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.draftId === draftId ? { ...t, editable } : t,
      ),
    })),

  instanceMap: {},
  getCurrentInstance: () => {
    const { instanceMap, activeTabId } = get();
    return activeTabId ? instanceMap[activeTabId] || null : null;
  },
  saveInstance: (draftId: string, instance: EditorState) =>
    set((state) => ({
      instanceMap: {
        ...state.instanceMap,
        [draftId]: instance,
      },
    })),
  invalidateTabInstance: (draftId: string) =>
    set((state) => ({
      instanceMap: {
        ...state.instanceMap,
        [draftId]: null,
      },
    })),
  invalidateAllTabs: () => set(() => ({ instanceMap: {} })),

  initialContentMap: {},
  setInitialContent: (draftId: string, content: Record<string, unknown>) =>
    set((state) => ({
      initialContentMap: {
        ...state.initialContentMap,
        [draftId]: content,
      },
    })),
  getInitialContent: (draftId: string) => {
    const { initialContentMap } = get();
    return initialContentMap[draftId] || null;
  },
}));
