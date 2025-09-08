import { useQuery } from "@tanstack/react-query";
import { getRequest, postRequest, queryClient } from "@/lib/queryClient";
import { UserLangEnum, type UserLang } from "./use-user";

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
  ts: number;
};

const keyKanban = (id: number) => ["/meta/kanban", id];

export function useKanban(id: number) {
  return useQuery<Kanban | null>({
    queryKey: keyKanban(id),
    queryFn: async () => {
      if (id === 0) {
        return null;
      }
      const response = await getRequest(
        "/api/tiptap?Action=GetTiptap&id=" + id,
      );
      const data = await response.json();
      return data.message as Kanban;
    },
  });
}

const enDefault = {
  Backlog: [],
  "In Progress": [],
  Done: [],
};

const cnDefault = {
  待办: [],
  进行中: [],
  已完成: [],
};

const getDefaultColumns = (language: UserLang) => {
  if (language === UserLangEnum.ZHCN) {
    return ["待办", "进行中", "已完成"];
  }
  return ["Backlog", "In Progress", "Done"];
};

const getDefaultColumnValue = (language: UserLang) => {
  if (language === UserLangEnum.ZHCN) {
    return cnDefault;
  }
  return enDefault;
};

export async function createKanban(language: UserLang) {
  const response = await postRequest("/api/tiptap?Action=CreateTiptap", {
    content: {
      columns: getDefaultColumns(language),
      columnValue: getDefaultColumnValue(language),
    },
  });
  const rst = await response.json();
  return rst.message.id;
}

export async function syncKanban(
  data: Omit<Kanban, "ts"> & { prev: number; curr: number },
) {
  return postRequest("/api/tiptap?Action=UpdateTiptap", { ...data });
}

export function removeKanbanQuery(id: number) {
  queryClient.removeQueries({
    queryKey: keyKanban(id),
    exact: true,
  });
}

export function invalidateKanbanQuery(id: number) {
  queryClient.invalidateQueries({
    queryKey: keyKanban(id),
    exact: true,
  });
}
