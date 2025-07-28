import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type Draft = {
  id: number;
  content: any;
};

const keyDraft = (id: number) => ["/api/tiptap", id];

export function useDraft(id: number) {
  return useQuery<Draft | null>({
    queryKey: keyDraft(id),
    queryFn: async () => {
      if (id === 0) {
        return null;
      }
      const response = await apiRequest(
        "POST",
        "/api/tiptap?Action=GetTiptap",
        {
          id,
        },
      );
      const data = await response.json();
      return data.message as Draft;
    },
  });
}

export async function useCreateTiptap() {
  const response = await apiRequest("POST", "/api/tiptap?Action=CreateTiptap", {
    content: {
      type: "doc",
      content: [],
    },
  });
  const rst = await response.json();
  return rst.message.id;
}

export function refetchDraft(draftId: number) {
  queryClient.refetchQueries({ queryKey: keyDraft(draftId) });
}

export function useSyncDraft() {
  return useMutation({
    mutationFn: async (data: Draft) => {
      await apiRequest("POST", "/api/tiptap?Action=UpdateTiptap", { ...data });
    },
  });
}
