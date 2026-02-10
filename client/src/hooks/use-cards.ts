import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flomoDatabase, type Card } from "@/lib/flomo-db";
import { v4 as uuidv4 } from "uuid";

const keyCards = () => ["/flomo/cards"];
const keyCardsInFolder = (folderId: string | null) => [
  "/flomo/cards",
  folderId,
];
const keyCard = (id: string) => ["/flomo/card", id];

/**
 * Hook to fetch all cards
 */
export function useCards() {
  return useQuery({
    queryKey: keyCards(),
    queryFn: async () => {
      return flomoDatabase.getAllCards();
    },
  });
}

/**
 * Hook to fetch cards in a specific folder
 */
export function useCardsInFolder(folderId: string | null) {
  return useQuery({
    queryKey: keyCardsInFolder(folderId),
    queryFn: async () => {
      return flomoDatabase.getCardsInFolder(folderId);
    },
  });
}

/**
 * Hook to fetch a single card
 */
export function useCard(id: string | undefined) {
  return useQuery({
    queryKey: keyCard(id!),
    enabled: !!id,
    queryFn: async () => {
      if (!id) return undefined;
      return flomoDatabase.getCard(id);
    },
  });
}

/**
 * Hook to create a new card
 */
export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      folderId: string | null;
      rawText: string;
      payload?: Record<string, unknown>;
    }) => {
      const now = Date.now();
      const cardId = uuidv4();
      const draftId = uuidv4();

      const card: Card = {
        id: cardId,
        createdAt: now,
        updatedAt: now,
        serverVersion: 0, // Will be set by server
        isDeleted: false,
        folderId: data.folderId,
        title: data.title,
        draft: draftId,
        payload: data.payload || {},
        rawText: data.rawText,
        syncStatus: "pending",
      };

      await flomoDatabase.putCard(card);
      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyCards() });
    },
  });
}

/**
 * Hook to update a card
 */
export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      folderId?: string | null;
      rawText?: string;
      payload?: Record<string, unknown>;
    }) => {
      const existing = await flomoDatabase.getCard(data.id);
      if (!existing) {
        throw new Error(`Card ${data.id} not found`);
      }

      const updated: Card = {
        ...existing,
        updatedAt: Date.now(),
        title: data.title ?? existing.title,
        folderId:
          data.folderId !== undefined ? data.folderId : existing.folderId,
        rawText: data.rawText ?? existing.rawText,
        payload: data.payload ?? existing.payload,
        syncStatus: "pending",
      };

      await flomoDatabase.putCard(updated);
      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keyCard(variables.id) });
      queryClient.invalidateQueries({ queryKey: keyCards() });
    },
  });
}

/**
 * Hook to delete a card (soft delete)
 */
export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const existing = await flomoDatabase.getCard(id);
      if (!existing) {
        throw new Error(`Card ${id} not found`);
      }

      const deleted: Card = {
        ...existing,
        updatedAt: Date.now(),
        isDeleted: true,
        syncStatus: "deleted",
      };

      await flomoDatabase.putCard(deleted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyCards() });
    },
  });
}
