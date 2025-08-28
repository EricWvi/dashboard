import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface Task {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  detail?: string;
}

export type KanbanContent = {
  columns: string[];
  columnValue: Record<string, Task[]>;
};

export type Kanban = {
  id: number;
  content: KanbanContent;
};

const keyKanban = (id: number) => ["/api/kanban", id];

export function useKanban(id: number) {
  return useQuery<Kanban | null>({
    queryKey: keyKanban(id),
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
      return data.message as Kanban;
    },
  });
}

export async function createKanban() {
  const response = await apiRequest("POST", "/api/tiptap?Action=CreateTiptap", {
    content: {
      columns: ["Backlog", "In Progress", "Done"],
      columnValue: {
        Backlog: [],
        "In Progress": [],
        Done: [],
      },
    },
  });
  const rst = await response.json();
  return rst.message.id;
}

export async function syncKanban(data: Kanban) {
  return apiRequest("POST", "/api/tiptap?Action=UpdateTiptap", {
    ...data,
    ts: Date.now(),
  });
}

export function removeKanbanQuery(id: number) {
  queryClient.removeQueries({
    queryKey: keyKanban(id),
    exact: true,
  });
}
