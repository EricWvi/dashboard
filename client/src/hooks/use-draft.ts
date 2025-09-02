import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest, queryClient } from "@/lib/queryClient";

export type Draft = {
  id: number;
  content: any;
  ts: number;
};

const keyDraft = (id: number) => ["/meta/tiptap", id];

export function useDraft(id: number) {
  return useQuery<Draft | null>({
    queryKey: keyDraft(id),
    queryFn: async () => {
      if (id === 0) {
        return null;
      }
      const response = await getRequest(
        "/api/tiptap?Action=GetTiptap&id=" + id,
      );
      const data = await response.json();
      return data.message as Draft;
    },
  });
}

const defaultContent = [
  {
    type: "paragraph",
    attrs: {
      textAlign: null,
    },
  },
];

export async function createTiptap(content: any = defaultContent) {
  const response = await postRequest("/api/tiptap?Action=CreateTiptap", {
    content: {
      type: "doc",
      content,
    },
  });
  const rst = await response.json();
  return rst.message.id as number;
}

export async function syncDraft(
  data: Omit<Draft, "ts"> & { prev: number; curr: number },
) {
  return postRequest("/api/tiptap?Action=UpdateTiptap", { ...data });
}

export function removeDraftQuery(id: number) {
  queryClient.removeQueries({
    queryKey: keyDraft(id),
    exact: true,
  });
}

export function invalidateDraftQuery(id: number) {
  queryClient.invalidateQueries({
    queryKey: keyDraft(id),
    exact: true,
  });
}

export type Quote = {
  date: Date;
  chapter: string;
  content: string;
};

const keyQuickNotes = () => ["/api/quicknotes"];

export type QuickNote = {
  id: number;
  title: string;
  draft: number;
};

export function useQuickNotes() {
  return useQuery({
    queryKey: keyQuickNotes(),
    queryFn: async () => {
      const response = await getRequest("/api/tiptap?Action=ListQuickNotes");
      const data = await response.json();
      return data.message.quickNotes as QuickNote[];
    },
  });
}

export function useUpdateQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<QuickNote>) => {
      const response = await postRequest("/api/tiptap?Action=UpdateQuickNote", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyQuickNotes(),
      });
    },
  });
}

export function useBottomQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      const response = await postRequest(
        "/api/tiptap?Action=BottomQuickNote",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyQuickNotes(),
      });
    },
  });
}

export function useCreateQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<QuickNote, "id">) => {
      const response = await postRequest("/api/tiptap?Action=CreateQuickNote", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyQuickNotes(),
      });
    },
  });
}

export function useDeleteQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      const response = await postRequest("/api/tiptap?Action=DeleteQuickNote", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyQuickNotes(),
      });
    },
  });
}
