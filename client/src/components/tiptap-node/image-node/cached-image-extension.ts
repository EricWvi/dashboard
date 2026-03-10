import { Image } from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { isTauri } from "@/lib/utils";

/**
 * Custom Image extension that handles media URL rewriting for Tauri.
 *
 * - In Tauri: images with src starting with `/api/m/` are rewritten to
 *   `https://onlyquant.localhost/api/m/{uuid}` so the custom protocol handler
 *   can intercept and serve them from local cache.
 * - In web: src is used as-is (relative path `/api/m/{uuid}`).
 * - The JSON document always stores src as `/api/m/{uuid}` regardless of platform.
 */
export const CachedImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    if (
      isTauri() &&
      typeof attrs.src === "string" &&
      attrs.src.startsWith("/api/m/")
    ) {
      attrs.src = `https://onlyquant.localhost${attrs.src}`;
    }
    return ["img", mergeAttributes(this.options.HTMLAttributes, attrs)];
  },
});
