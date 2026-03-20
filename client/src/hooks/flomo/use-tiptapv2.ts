import { flomoDatabase } from "@/lib/flomo/db-interface";
import { type JSONContent } from "@tiptap/react";

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

export async function updateTiptapTitle(id: string, title: string) {
  const prev = await flomoDatabase.getTiptap(id);
  if (!prev) return;
  const content = prev.content as JSONContent;
  const titleNode = content.content?.find(
    (node) => node.type === "heading" && node.attrs?.level === 1,
  );
  if (titleNode) {
    titleNode.content = [{ text: title, type: "text" }];
  } else {
    content.content?.unshift({
      type: "heading",
      attrs: { level: 1, textAlign: null },
      content: [{ text: title, type: "text" }],
    });
  }
  return flomoDatabase.updateTiptap(id, {
    content,
    history: [{ time: Date.now(), content }, ...(prev.history || [])],
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
  return flomoDatabase.syncTiptap(id, content);
}

export async function saveDraft({
  id,
  cardId,
  content,
}: {
  id: string;
  cardId: string;
  content: JSONContent;
}) {
  const prev = await flomoDatabase.getTiptap(id);
  const title = content.content?.find(
    (node) => node.type === "heading" && node.attrs?.level === 1,
  )?.content?.[0].text;
  if (title) {
    const card = await flomoDatabase.getCard(cardId);
    if (card!.title !== title) {
      await flomoDatabase.updateCard(cardId, { title });
    }
  }
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
