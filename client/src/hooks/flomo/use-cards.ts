import { useQuery, useMutation } from "@tanstack/react-query";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { type CardField } from "@/lib/flomo/model";
import keys from "./query-keys";
import { createTiptap } from "@/hooks/tiptap/use-tiptapv2";

/**
 * Hook to fetch cards in a specific folder
 */
export function useCardsInFolder(folderId: string) {
  return useQuery({
    queryKey: keys.cards.inFolder(folderId),
    queryFn: async () => {
      return flomoDatabase.getCardsInFolder(folderId);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch a single card
 */
export function useCard(id: string) {
  return useQuery({
    queryKey: keys.cards.detail(id),
    queryFn: async () => {
      return flomoDatabase.getCard(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to create a new card
 */
export function useCreateCard() {
  return useMutation({
    mutationFn: async (data: {
      folderId: string;
      title: string;
      payload: Record<string, unknown>;
    }) => {
      const draftId = await createTiptap();
      return flomoDatabase.addCard({
        ...data,
        draft: draftId,
        rawText: "",
      });
    },
  });
}

/**
 * Hook to update a card
 */
export function useUpdateCard() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CardField>;
    }) => {
      return flomoDatabase.updateCard(id, data);
    },
  });
}

/**
 * Hook to delete a card (soft delete)
 */
export function useDeleteCard() {
  return useMutation({
    mutationFn: async (id: string) => {
      return flomoDatabase.softDeleteCard(id);
    },
  });
}
