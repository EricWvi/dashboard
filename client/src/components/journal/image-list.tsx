import { formatMediaUrl } from "@/lib/utils";

type Props = {
  imgSrc: string[];
};

export const ImgBlock = ({ src }: { src: string }) => (
  <img
    className="h-full w-full rounded-sm object-cover"
    src={formatMediaUrl(src)}
    alt="img"
  />
);

export const ImageList = ({ imgSrc }: Props) => {
  const imgBlock = (src: string) => <ImgBlock src={src} />;

  // `flex-1` alone sometimes doesn't work as expected
  // for equal heights unless you set `h-0` on the children.
  // This allows the flex algorithm to allocate the available height equally.
  if (!imgSrc || imgSrc.length === 0) {
    return null;
  }
  let imgList = <></>;
  if (imgSrc.length === 1) {
    imgList = imgBlock(imgSrc[0]);
  } else if (imgSrc.length === 2) {
    imgList = (
      <>
        <div className="h-full flex-1">{imgBlock(imgSrc[0])}</div>
        <div className="h-full flex-1">{imgBlock(imgSrc[1])}</div>
      </>
    );
  } else if (imgSrc.length === 3) {
    imgList = (
      <>
        <div className="h-full flex-1">{imgBlock(imgSrc[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">{imgBlock(imgSrc[1])}</div>
          <div className="h-0 w-full flex-1">{imgBlock(imgSrc[2])}</div>
        </div>
      </>
    );
  } else if (imgSrc.length === 4) {
    imgList = (
      <>
        <div className="h-full flex-1">{imgBlock(imgSrc[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="h-0 w-full flex-1">{imgBlock(imgSrc[1])}</div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{imgBlock(imgSrc[2])}</div>
            <div className="h-full flex-1">{imgBlock(imgSrc[3])}</div>
          </div>
        </div>
      </>
    );
  } else if (imgSrc.length === 5) {
    imgList = (
      <>
        <div className="h-full flex-1">{imgBlock(imgSrc[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{imgBlock(imgSrc[1])}</div>
            <div className="h-full flex-1">{imgBlock(imgSrc[2])}</div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{imgBlock(imgSrc[3])}</div>
            <div className="h-full flex-1">{imgBlock(imgSrc[4])}</div>
          </div>
        </div>
      </>
    );
  } else if (imgSrc.length > 5) {
    imgList = (
      <>
        <div className="h-full flex-1">{imgBlock(imgSrc[0])}</div>
        <div className="flex h-full flex-1 flex-col gap-[3px]">
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{imgBlock(imgSrc[1])}</div>
            <div className="h-full flex-1">{imgBlock(imgSrc[2])}</div>
          </div>
          <div className="flex h-0 w-full flex-1 gap-[3px]">
            <div className="h-full flex-1">{imgBlock(imgSrc[3])}</div>
            <div className="relative h-full flex-1">
              <div className="absolute inset-0 rounded-sm bg-gray-300"></div>
              {imgBlock(imgSrc[4])}
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
