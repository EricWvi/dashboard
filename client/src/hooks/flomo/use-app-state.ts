import { RootFolderId } from "@/lib/flomo/model";
import { create } from "zustand";

interface AppState {
  currentFolderId: string;
  setCurrentFolderId: (id: string) => void;
}

export const useAppState = create<AppState>((set) => ({
  currentFolderId: RootFolderId,
  setCurrentFolderId: (id: string) => set(() => ({ currentFolderId: id })),
}));
