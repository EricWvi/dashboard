import { useQuery, useMutation } from "@tanstack/react-query";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import {
  ArchiveFolderId,
  RootFolderId,
  type FolderField,
  type FolderPayload,
} from "@/lib/flomo/model";
import keys from "./query-keys";

/**
 * Hook to fetch folders under a specific parent
 */
export function useFoldersInParent(parentId: string) {
  return useQuery({
    queryKey: keys.folders.subFolders(parentId),
    queryFn: async () => {
      return flomoDatabase.getFoldersInParent(parentId);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useFolderPath(folderId: string) {
  return useQuery({
    queryKey: keys.folders.path(folderId),
    queryFn: async () => {
      const path = [];
      if (folderId === ArchiveFolderId) {
        return [];
      }
      let currentId = folderId;
      while (currentId !== RootFolderId) {
        const folder = await flomoDatabase.getFolder(currentId);
        if (!folder) {
          break;
        }
        path.push({
          id: folder.id,
          title: folder.title,
          isArchived: folder.isArchived,
        });
        currentId = folder.parentId;
      }
      return path.reverse();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single folder
 */
export function useFolder(id: string) {
  return useQuery({
    queryKey: keys.folders.detail(id),
    queryFn: async () => {
      return flomoDatabase.getFolder(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to create a new folder
 */
export function useCreateFolder() {
  return useMutation({
    mutationFn: async (data: {
      parentId: string;
      title: string;
      payload: FolderPayload;
    }) => {
      return flomoDatabase.addFolder({
        ...data,
        isBookmarked: 0,
        isArchived: 0,
      });
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FolderField>;
    }) => {
      return flomoDatabase.updateFolder(id, data);
    },
  });
}

/**
 * Hook to delete a folder (soft delete)
 */
export function useDeleteFolder() {
  return useMutation({
    mutationFn: async (id: string) => {
      return flomoDatabase.softDeleteFolder(id);
    },
  });
}
