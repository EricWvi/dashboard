import { flomoDatabase } from "@/lib/flomo/db-interface";
import keys from "./query-keys";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash/debounce";

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
  return flomoDatabase.addTiptap({
    content: { type: "doc", content },
    history: [],
  });
}

export async function createTiptapWithTitle(title: string) {
  return flomoDatabase.addTiptap({
    content: { type: "doc", content: contentWithTitle(title) },
    history: [],
  });
}

export function useDraft(id: string) {
  return useQuery({
    enabled: !!id,
    queryKey: keys.tiptaps.detail(id),
    queryFn: async () => {
      return flomoDatabase.getTiptap(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export async function syncDraft({
  id,
  content,
}: {
  id: string;
  content: Record<string, unknown>;
}) {
  const prev = await flomoDatabase.getTiptap(id);
  if (prev && prev.history.length === 0) {
    await flomoDatabase.updateTiptap(id, {
      content,
      history: [{ time: prev.updatedAt, content: prev.content }],
    });
    return;
  }
  return flomoDatabase.updateTiptap(id, { content });
}

export async function saveDraft({
  id,
  content,
}: {
  id: string;
  content: Record<string, unknown>;
}) {
  const prev = await flomoDatabase.getTiptap(id);
  return flomoDatabase.updateTiptap(id, {
    content,
    history: [{ time: Date.now(), content }, ...(prev?.history || [])],
  });
}

export async function getContent(id: string) {
  return flomoDatabase.getTiptap(id);
}

export async function getHistory(id: string, ts: number) {
  return flomoDatabase.getTiptapHistory(id, ts);
}

export async function restoreHistory(id: string, ts: number) {
  return flomoDatabase.restoreTiptapHistory(id, ts);
}

export async function listHistory(id: string) {
  return flomoDatabase.listTiptapHistory(id);
}
