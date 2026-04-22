import { useMutation, useQuery } from "@tanstack/react-query";
import keys from "./query-keys";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import type { QuickNoteField } from "@/lib/dashboard/model";

export function useQuickNotes() {
  return useQuery({
    queryKey: keys.quickNotes.all,
    queryFn: async () => {
      return dashboardDatabase.getQuickNotes();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useUpdateQuickNote() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<QuickNoteField>;
    }) => {
      return dashboardDatabase.updateQuickNote(id, data);
    },
  });
}

export function useBottomQuickNote() {
  return useMutation({
    mutationFn: async (data: { id: string }) => {
      const quickNotes = await dashboardDatabase.getQuickNotes();
      const minOrder = quickNotes.reduce(
        (min, note) => Math.min(min, note.order),
        0,
      );
      await dashboardDatabase.updateQuickNote(data.id, {
        order: Math.min(minOrder - 1, -1),
      });
    },
  });
}

export function useCreateQuickNote() {
  return useMutation({
    mutationFn: async (data: { title: string; draft: string }) => {
      const quickNotes = await dashboardDatabase.getQuickNotes();
      const maxOrder = quickNotes.reduce(
        (max, note) => Math.max(max, note.order),
        0,
      );
      return dashboardDatabase.addQuickNote({ ...data, order: maxOrder + 1 });
    },
  });
}

export function useDeleteQuickNote() {
  return useMutation({
    mutationFn: async (id: string) => {
      await dashboardDatabase.softDeleteQuickNote(id);
    },
  });
}
