import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import { create } from "zustand";

interface AppState {
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;

  isArchiveMode: boolean;
  enterArchiveMode: () => void;
  exitArchiveMode: () => void;
}

export const useAppState = create<AppState>((set) => ({
  currentFolderId: RootFolderId,
  setCurrentFolderId: (id: string) => set(() => ({ currentFolderId: id })),

  isArchiveMode: false,
  enterArchiveMode: () =>
    set(() => ({ isArchiveMode: true, currentFolderId: ArchiveFolderId })),
  exitArchiveMode: () =>
    set(() => ({ isArchiveMode: false, currentFolderId: RootFolderId })),
}));
