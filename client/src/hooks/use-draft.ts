import { useQuery } from "@tanstack/react-query";
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

export async function createTiptap() {
  const response = await apiRequest("POST", "/api/tiptap?Action=CreateTiptap", {
    content: {
      type: "doc",
      content: [],
    },
  });
  const rst = await response.json();
  return rst.message.id;
}

export async function createKanban() {
  const response = await apiRequest(
    "POST",
    "/api/tiptap?Action=CreateKanban",
    {},
  );
  const rst = await response.json();
  return rst.message.id;
}

export async function syncDraft(data: Draft) {
  await apiRequest("POST", "/api/tiptap?Action=UpdateTiptap", { ...data });
}

export function removeDraftQuery(id: number) {
  queryClient.removeQueries({
    queryKey: keyDraft(id),
    exact: true,
  });
}
