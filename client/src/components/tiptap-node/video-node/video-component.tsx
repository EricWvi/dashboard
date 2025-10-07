import React from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import "./video-node.scss";

interface VideoAttrs {
  src: string;
  width?: string;
  height?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
}

export const VideoComponent: React.FC<NodeViewProps> = ({ node, selected }) => {
  const { src, width, height, controls, autoplay, loop, muted, poster } =
    node.attrs as VideoAttrs;

  if (!src) {
    return null;
  }

  return (
    <NodeViewWrapper
      className={`video-node-view ${selected ? "selected" : ""}`}
    >
      <div className="video-wrapper">
        <video
          src={src}
          width={width}
          height={height}
          controls={controls}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          poster={poster}
          className="video-element"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </NodeViewWrapper>
  );
};
