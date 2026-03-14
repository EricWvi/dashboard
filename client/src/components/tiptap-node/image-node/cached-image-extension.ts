import { Image } from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { formatMediaUrl } from "@/lib/utils";

export const CachedImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    attrs.src = formatMediaUrl(attrs.src);
    return ["img", mergeAttributes(this.options.HTMLAttributes, attrs)];
  },
});
