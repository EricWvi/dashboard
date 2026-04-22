import { useQuery } from "@tanstack/react-query";
import { UserLangEnum, type UserLang } from "@/lib/model";
import keys from "./query-keys";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import { createTiptap, saveDraft, syncDraft } from "./use-tiptapv2";

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

export interface Kanban {
  id: string;
  content: KanbanContent;
}

export function useKanban(id: string) {
  return useQuery({
    enabled: !!id,
    queryKey: keys.tiptaps.detail(id),
    queryFn: async () => {
      return dashboardDatabase.getTiptap(id) as Promise<Kanban | undefined>;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
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
  return createTiptap({
    columns: getDefaultColumns(language),
    columnValue: getDefaultColumnValue(language),
  });
}

export async function syncKanban(data: Kanban) {
  await syncDraft(data);
}

export async function saveKanban(data: Kanban) {
  await saveDraft(data);
}
