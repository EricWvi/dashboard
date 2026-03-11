import { Image } from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { isTauri } from "@/lib/utils";

export const CachedImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    if (
      isTauri() &&
      typeof attrs.src === "string" &&
      attrs.src.startsWith("/api/m/")
    ) {
      attrs.src = `onlyquant://localhost${attrs.src}`;
    }
    return ["img", mergeAttributes(this.options.HTMLAttributes, attrs)];
  },
});
