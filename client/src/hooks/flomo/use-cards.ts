import { useQuery, useMutation } from "@tanstack/react-query";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { type CardField, type CardPayload } from "@/lib/flomo/model";
import keys from "./query-keys";
import { createTiptapWithTitle } from "@/hooks/flomo/use-tiptapv2";
import { generateKeyBetween } from "fractional-indexing";

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
    enabled: !!id,
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
      payload: Omit<CardPayload, "sortOrder">;
    }) => {
      const lastOrder = await flomoDatabase.lastOrderInFolder(
        data.folderId,
        "card",
      );
      const sortOrder = generateKeyBetween(lastOrder, null);
      const draftId = await createTiptapWithTitle(data.title);
      return flomoDatabase.addCard({
        ...data,
        payload: { ...data.payload, sortOrder },
        draft: draftId,
        rawText: "",
        isBookmarked: 0,
        isArchived: 0,
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

/**
 * Hook to fetch bookmarked cards
 */
export function useBookmarkedCards() {
  return useQuery({
    queryKey: keys.cards.bookmarked(),
    queryFn: async () => {
      return flomoDatabase.getBookmarkedCards();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Hook to fetch recently updated cards
 */
export function useRecentCards(limit: number) {
  return useQuery({
    queryKey: keys.cards.recent(limit),
    queryFn: async () => {
      return flomoDatabase.getRecentCards(limit);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}
