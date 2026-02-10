import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flomoDatabase, type Folder } from "@/lib/flomo-db";
import { v4 as uuidv4 } from "uuid";

const keyFolders = () => ["/flomo/folders"];
const keyFoldersInParent = (parentId: string | null) => [
  "/flomo/folders",
  parentId,
];
const keyFolder = (id: string) => ["/flomo/folder", id];

/**
 * Hook to fetch all folders
 */
export function useFolders() {
  return useQuery({
    queryKey: keyFolders(),
    queryFn: async () => {
      return flomoDatabase.getAllFolders();
    },
  });
}

/**
 * Hook to fetch folders under a specific parent
 */
export function useFoldersInParent(parentId: string | null) {
  return useQuery({
    queryKey: keyFoldersInParent(parentId),
    queryFn: async () => {
      return flomoDatabase.getFoldersInParent(parentId);
    },
  });
}

/**
 * Hook to fetch a single folder
 */
export function useFolder(id: string | undefined) {
  return useQuery({
    queryKey: keyFolder(id!),
    enabled: !!id,
    queryFn: async () => {
      if (!id) return undefined;
      return flomoDatabase.getFolder(id);
    },
  });
}

/**
 * Hook to create a new folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      parentId: string | null;
      payload?: Record<string, unknown>;
    }) => {
      const now = Date.now();
      const folderId = uuidv4();

      const folder: Folder = {
        id: folderId,
        createdAt: now,
        updatedAt: now,
        serverVersion: 0, // Will be set by server
        isDeleted: false,
        parentId: data.parentId,
        title: data.title,
        payload: data.payload || {},
        syncStatus: "pending",
      };

      await flomoDatabase.putFolder(folder);
      return folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFolders() });
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      parentId?: string | null;
      payload?: Record<string, unknown>;
    }) => {
      const existing = await flomoDatabase.getFolder(data.id);
      if (!existing) {
        throw new Error(`Folder ${data.id} not found`);
      }

      const updated: Folder = {
        ...existing,
        updatedAt: Date.now(),
        title: data.title ?? existing.title,
        parentId:
          data.parentId !== undefined ? data.parentId : existing.parentId,
        payload: data.payload ?? existing.payload,
        syncStatus: "pending",
      };

      await flomoDatabase.putFolder(updated);
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keyFolder(variables.id) });
      queryClient.invalidateQueries({ queryKey: keyFolders() });
    },
  });
}

/**
 * Hook to delete a folder (soft delete)
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await flomoDatabase.getFolder(id);
      if (!existing) {
        throw new Error(`Folder ${id} not found`);
      }

      const deleted: Folder = {
        ...existing,
        updatedAt: Date.now(),
        isDeleted: true,
        syncStatus: "deleted",
      };

      await flomoDatabase.putFolder(deleted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFolders() });
    },
  });
}
