import { create } from "zustand";

interface OverlayState {
  activeOverlays: { id: string; closeCallback?: () => void }[];
  open: (id: string, closeCallback?: () => void) => void;
  close: (id: string) => void;
  isOpened: (id: string) => boolean;
}

export const useOverlayStore = create<OverlayState>((set, get) => ({
  activeOverlays: [],
  open: (id, closeCallback) =>
    set((state) => ({
      activeOverlays: [...state.activeOverlays, { id, closeCallback }],
    })),
  close: (id) =>
    set((state) => {
      const overlay = state.activeOverlays.find((i) => i.id === id);
      if (overlay?.closeCallback) {
        overlay.closeCallback();
      }
      return {
        activeOverlays: state.activeOverlays.filter((i) => i.id !== id),
      };
    }),
  isOpened: (id) => get().activeOverlays.some((i) => i.id === id),
}));
