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

  // For video, show as image with play button overlay
  return (
    <div className="relative h-full w-full cursor-pointer" onClick={onClick}>
      <video
        className="h-full w-full rounded-md object-cover"
        src={formatMediaUrl(media.src)}
        autoPlay={false}
      />
      {/* Decorative play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-opacity-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/80">
          {/* Play icon using CSS triangle */}
          <div className="ml-1 h-0 w-0 border-t-[8px] border-b-[8px] border-l-[12px] border-t-transparent border-b-transparent border-l-white"></div>
        </div>
      </div>
    </div>
  );
};

const mediaBlock = (
  media: MediaItem,
  index: number,
  onItemClick?: (index: number) => void,
) => <MediaBlock media={media} onClick={() => onItemClick?.(index)} />;

export const ImageList = ({ items, onItemClick }: Props) => {
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
                <span className="text-xl text-white sm:text-2xl md:text-3xl">
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
};
