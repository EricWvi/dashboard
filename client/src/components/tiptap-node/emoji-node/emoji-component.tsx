import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { wechatEmojis } from "@/components/emoji/wechat-emoji";

interface EmojiAttrs {
  emojiId: string;
}

export const EmojiComponent: React.FC<NodeViewProps> = ({ node }) => {
  const { emojiId } = node.attrs as EmojiAttrs;

  if (!emojiId) {
    return null;
  }

  const emoji = wechatEmojis.find((e) => e.id === emojiId);

  if (!emoji) {
    return null;
  }

  return (
    <NodeViewWrapper className="emoji-node-view inline">
      <img
        src={emoji.url}
        alt={emoji.name}
        title={emoji.name}
        width={20}
        height={20}
        style={{ display: "inline-block", verticalAlign: "top" }}
        contentEditable={false}
        data-emoji-id={emojiId}
      />
    </NodeViewWrapper>
  );
};
