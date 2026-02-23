import { flomoDatabase } from "@/lib/flomo/db-interface";

const defaultContent = [
  {
    type: "paragraph",
    attrs: {
      textAlign: null,
    },
  },
];

export async function createTiptap(content: any = defaultContent) {
  return flomoDatabase.addTiptap({
    content: { type: "doc", content },
    history: [],
  });
}
