import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EmojiComponent } from "./emoji-component.tsx";

export interface EmojiOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emoji: {
      /**
       * Insert an emoji
       */
      setEmoji: (emojiId: string) => ReturnType;
    };
  }
}

export const EmojiExtension = Node.create<EmojiOptions>({
  name: "emoji",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      emojiId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-emoji-id"),
        renderHTML: (attributes) => {
          if (!attributes.emojiId) {
            return {};
          }
          return {
            "data-emoji-id": attributes.emojiId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `img[data-emoji-id]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmojiComponent);
  },

  addCommands() {
    return {
      setEmoji:
        (emojiId: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { emojiId },
          });
        },
    };
  },
});
