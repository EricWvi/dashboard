import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import type { Swiper as SwiperType } from "swiper";

export type MediaItem = {
  type: "image" | "video";
  src: string;
};

interface MediaSwiperProps {
  items: MediaItem[];
  initialSlide?: number;
  onClose?: () => void;
  onSlideChange?: (activeIndex: number) => void;
  onSwiperInit?: (swiper: SwiperType) => void;
  onNavigationChange?: (isBeginning: boolean, isEnd: boolean) => void;
}

export function MediaSwiper({
  items,
  initialSlide = 0,
  onClose,
  onSlideChange,
  onSwiperInit,
  onNavigationChange,
}: MediaSwiperProps) {
  return (
    <Swiper
      spaceBetween={30}
      initialSlide={initialSlide}
      onSlideChange={(swiper) => {
        onSlideChange?.(swiper.activeIndex);
        onNavigationChange?.(swiper.isBeginning, swiper.isEnd);
      }}
      onSwiper={(swiper) => {
        onSwiperInit?.(swiper);
        onNavigationChange?.(swiper.isBeginning, swiper.isEnd);
      }}
      className="h-full w-full overflow-hidden rounded-lg"
    >
      {items.map((item, idx) => (
        <SwiperSlide key={idx} className="h-full">
          <div
            className="flex h-full items-center justify-center"
            onClick={onClose}
          >
            {item.type === "image" ? (
              <img
                src={item.src}
                alt=""
                className="max-h-full w-full object-contain"
              />
            ) : (
              <video
                src={item.src}
                controls
                className="w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
