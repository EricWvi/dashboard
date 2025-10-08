import { formatMediaUrl } from "@/lib/utils";
import type { MediaItem } from "./media-swiper";

type Props = {
  items: MediaItem[];
};

export const MediaBlock = ({ media }: { media: MediaItem }) =>
  media.type === "image" ? (
    <img
      className="h-full w-full rounded-sm object-cover"
      src={formatMediaUrl(media.src)}
      alt="img"
    />
  ) : (
    <video
      className="h-full w-full rounded-sm object-cover"
      src={formatMediaUrl(media.src)}
      autoPlay={false}
    />
  );

const mediaBlock = (media: MediaItem) => <MediaBlock media={media} />;

export const ImageList = ({ items }: Props) => {
  // `flex-1` alone sometimes doesn't work as expected
  // for equal heights unless you set `h-0` on the children.
  // This allows the flex algorithm to allocate the available height equally.
  if (!items || items.length === 0) {
    return null;
  }
  let imgList = <></>;
  if (items.length === 1) {
    imgList = mediaBlock(items[0]);
  } else if (items.length === 2) {
    imgList = (
      <>
        <div className="h-full flex-1">{mediaBlock(items[0])}</div>
        <div className="h-full flex-1">{mediaBlock(items[1])}</div>
      </>
    );
  } else if (items.length === 3) {
    imgList = (
      <>
        <div className="h-full flex-1">{mediaBlock(items[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">{mediaBlock(items[1])}</div>
          <div className="h-0 w-full flex-1">{mediaBlock(items[2])}</div>
        </div>
      </>
    );
  } else if (items.length === 4) {
    imgList = (
      <>
        <div className="h-full flex-1">{mediaBlock(items[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">{mediaBlock(items[1])}</div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{mediaBlock(items[2])}</div>
            <div className="h-full flex-1">{mediaBlock(items[3])}</div>
          </div>
        </div>
      </>
    );
  } else if (items.length === 5) {
    imgList = (
      <>
        <div className="h-full flex-1">{mediaBlock(items[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{mediaBlock(items[1])}</div>
            <div className="h-full flex-1">{mediaBlock(items[2])}</div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{mediaBlock(items[3])}</div>
            <div className="h-full flex-1">{mediaBlock(items[4])}</div>
          </div>
        </div>
      </>
    );
  } else if (items.length > 5) {
    imgList = (
      <>
        <div className="h-full flex-1">{mediaBlock(items[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{mediaBlock(items[1])}</div>
            <div className="h-full flex-1">{mediaBlock(items[2])}</div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{mediaBlock(items[3])}</div>
            <div className="relative h-full flex-1">
              <div className="absolute inset-0 rounded-sm bg-gray-300"></div>
              {mediaBlock(items[4])}
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <div className="h-42 overflow-hidden rounded-md">
      <div className="flex h-full w-full gap-[3px]">{imgList}</div>
    </div>
  );
};
