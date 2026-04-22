import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import { type JSONContent } from "@tiptap/react";
import keys from "./query-keys";
import { useQuery } from "@tanstack/react-query";

export function useDraft(id: string) {
  return useQuery({
    enabled: !!id,
    queryKey: keys.tiptaps.detail(id),
    queryFn: async () => {
      return dashboardDatabase.getTiptap(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
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

const contentWithTitle = (title: string) => [
  {
    type: "heading",
    attrs: {
      level: 1,
      textAlign: null,
    },
    content: [
      {
        text: title,
        type: "text",
      },
    ],
  },
  {
    type: "paragraph",
    attrs: { textAlign: null },
  },
];

export async function createTiptap(content: any = defaultContent) {
  return dashboardDatabase.addTiptap({
    content: { type: "doc", content },
    history: [],
  });
}

export async function createTiptapWithTitle(title: string) {
  return dashboardDatabase.addTiptap({
    content: { type: "doc", content: contentWithTitle(title) },
    history: [],
  });
}

export async function syncDraft({
  id,
  content,
}: {
  id: string;
  content: Record<string, unknown>;
}) {
  const prev = await dashboardDatabase.getTiptap(id);
  if (prev && prev.history.length === 0) {
    await dashboardDatabase.updateTiptap(id, {
      content,
      history: [{ time: prev.updatedAt, content: prev.content }],
    });
    return;
  }
  return dashboardDatabase.syncTiptap(id, content);
}

export async function saveDraft({
  id,
  content,
}: {
  id: string;
  content: JSONContent;
}) {
  const prev = await dashboardDatabase.getTiptap(id);
  return dashboardDatabase.updateTiptap(id, {
    content,
    history: [{ time: Date.now(), content }, ...(prev?.history || [])],
  });
}

export async function getContent(id: string) {
  return dashboardDatabase.getTiptap(id);
}

export async function getHistory(id: string, ts: number) {
  return dashboardDatabase.getTiptapHistory(id, ts);
}

export async function restoreHistory(id: string, ts: number) {
  return dashboardDatabase.restoreTiptapHistory(id, ts);
}

export async function listHistory(id: string) {
  return dashboardDatabase.listTiptapHistory(id);
}
