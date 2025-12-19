import React, { useState } from "react";
import { formatMediaUrl } from "@/lib/utils";
import type { MediaItem } from "./media-swiper";

type Props = {
  items: MediaItem[];
  onItemClick?: (index: number) => void;
};

export const MediaBlock = ({
  media,
  onClick,
}: {
  media: MediaItem;
  onClick?: () => void;
}) => {
  const [duration, setDuration] = useState<number | null>(null);

  if (media.type === "image") {
    return (
      <img
        className="h-full w-full cursor-pointer rounded-md object-cover"
        src={formatMediaUrl(media.src)}
        alt="img"
        onClick={onClick}
      />
    );
  }

  // For video, show as image with duration overlay
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
      setDuration(video.duration);
    }
  };

  return (
    <div className="relative h-full w-full cursor-pointer" onClick={onClick}>
      <video
        className="h-full w-full rounded-md object-cover"
        src={formatMediaUrl(media.src)}
        autoPlay={false}
        onLoadedMetadata={handleLoadedMetadata}
      />
      {/* Video duration overlay at bottom right */}
      {duration !== null && (
        <div className="image-overlay absolute right-1 bottom-1 rounded-lg px-2">
          <span className="text-sm font-semibold text-white">
            {formatDuration(duration)}
          </span>
        </div>
      )}
    </div>
  );
};

const mediaBlock = (
  media: MediaItem,
  index: number,
  onItemClick?: (index: number) => void,
) => <MediaBlock media={media} onClick={() => onItemClick?.(index)} />;

export const ImageList = React.memo(({ items, onItemClick }: Props) => {
  // `flex-1` alone sometimes doesn't work as expected
  // for equal heights unless you set `h-0` on the children.
  // This allows the flex algorithm to allocate the available height equally.
  if (!items || items.length === 0) {
    return null;
  }
  let imgList = <></>;
  if (items.length === 1) {
    imgList = mediaBlock(items[0], 0, onItemClick);
  } else if (items.length === 2) {
    imgList = (
      <>
        <div className="h-full flex-1">
          {mediaBlock(items[0], 0, onItemClick)}
        </div>
        <div className="h-full flex-1">
          {mediaBlock(items[1], 1, onItemClick)}
        </div>
      </>
    );
  } else if (items.length === 3) {
    imgList = (
      <>
        <div className="h-full flex-1">
          {mediaBlock(items[0], 0, onItemClick)}
        </div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">
            {mediaBlock(items[1], 1, onItemClick)}
          </div>
          <div className="h-0 w-full flex-1">
            {mediaBlock(items[2], 2, onItemClick)}
          </div>
        </div>
      </>
    );
  } else if (items.length === 4) {
    imgList = (
      <>
        <div className="h-full flex-1">
          {mediaBlock(items[0], 0, onItemClick)}
        </div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">
            {mediaBlock(items[1], 1, onItemClick)}
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">
              {mediaBlock(items[2], 2, onItemClick)}
            </div>
            <div className="h-full flex-1">
              {mediaBlock(items[3], 3, onItemClick)}
            </div>
          </div>
        </div>
      </>
    );
  } else if (items.length === 5) {
    imgList = (
      <>
        <div className="h-full flex-1">
          {mediaBlock(items[0], 0, onItemClick)}
        </div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">
              {mediaBlock(items[1], 1, onItemClick)}
            </div>
            <div className="h-full flex-1">
              {mediaBlock(items[2], 2, onItemClick)}
            </div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">
              {mediaBlock(items[3], 3, onItemClick)}
            </div>
            <div className="h-full flex-1">
              {mediaBlock(items[4], 4, onItemClick)}
            </div>
          </div>
        </div>
      </>
    );
  } else if (items.length > 5) {
    imgList = (
      <>
        <div className="h-full flex-1">
          {mediaBlock(items[0], 0, onItemClick)}
        </div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">
              {mediaBlock(items[1], 1, onItemClick)}
            </div>
            <div className="h-full flex-1">
              {mediaBlock(items[2], 2, onItemClick)}
            </div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">
              {mediaBlock(items[3], 3, onItemClick)}
            </div>
            <div className="relative h-full flex-1">
              <div
                className="image-overlay absolute inset-0 z-20 flex items-center justify-center rounded-md bg-black/20"
                onClick={() => onItemClick?.(4)}
              >
                <span className="mr-[1px] text-2xl text-[rgb(156,157,165)] sm:text-3xl md:mr-[2px] md:text-4xl">
                  +
                </span>
                <span className="text-xl font-medium text-white sm:text-2xl md:text-3xl">
                  {items.length - 4}
                </span>
              </div>
              {mediaBlock(items[4], 4, onItemClick)}
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="aspect-[2/1] w-full overflow-hidden rounded-lg">
      {/* transform-gpu: In Chrome (especially on Android), that clipping context cause visual side effects 
           such as: slight darkening (dimming) in Android’s multitask app preview 
                    emoji blurring */}
      <div className="flex h-full w-full transform-gpu gap-[3px]">
        {imgList}
      </div>
    </div>
  );
});
