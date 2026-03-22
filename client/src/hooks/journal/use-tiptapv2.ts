import { journalDatabase } from "@/lib/journal/db-interface";
import { type JSONContent } from "@tiptap/react";

const defaultContent = [
  {
    type: "paragraph",
    attrs: {
      textAlign: null,
    },
  },
];

export async function createTiptap(content: any = defaultContent) {
  return journalDatabase.addTiptap({
    content: { type: "doc", content },
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
  const prev = await journalDatabase.getTiptap(id);
  if (prev && prev.history.length === 0) {
    await journalDatabase.updateTiptap(id, {
      content,
      history: [{ time: prev.updatedAt, content: prev.content }],
    });
    return;
  }
  return journalDatabase.syncTiptap(id, content);
}

export async function saveDraft({
  id,
  content,
}: {
  id: string;
  content: JSONContent;
}) {
  const prev = await journalDatabase.getTiptap(id);
  return journalDatabase.updateTiptap(id, {
    content,
    history: [{ time: Date.now(), content }, ...(prev?.history || [])],
  });
}

export async function getContent(id: string) {
  return journalDatabase.getTiptap(id);
}

export async function getHistory(id: string, ts: number) {
  return journalDatabase.getTiptapHistory(id, ts);
}

export async function restoreHistory(id: string, ts: number) {
  return journalDatabase.restoreTiptapHistory(id, ts);
}

export async function listHistory(id: string) {
  return journalDatabase.listTiptapHistory(id);
}
