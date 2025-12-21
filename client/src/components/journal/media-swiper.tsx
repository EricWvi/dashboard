import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/zoom";
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
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const DOUBLE_TAP_ZOOM = 2; // Zoom level for double tap
  const MAX_PINCH_ZOOM = 10; // Maximum zoom level for pinch

  const handleTap = () => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      return;
    }

    tapTimeoutRef.current = setTimeout(() => {
      onClose?.();
    }, 250);
  };

  const handleDoubleTap = (swiper: SwiperType) => {
    if (swiper.zoom.scale === 1) {
      swiper.zoom.in(DOUBLE_TAP_ZOOM);
    } else {
      swiper.zoom.out();
    }
  };

  return (
    <Swiper
      spaceBetween={30}
      initialSlide={initialSlide}
      zoom={{
        maxRatio: MAX_PINCH_ZOOM,
        minRatio: 1,
        toggle: false, // Disable default double-tap zoom toggle
      }}
      modules={[Zoom]}
      onSlideChange={(swiper) => {
        onSlideChange?.(swiper.activeIndex);
        onNavigationChange?.(swiper.isBeginning, swiper.isEnd);
      }}
      onSwiper={(swiper) => {
        onSwiperInit?.(swiper);
        onNavigationChange?.(swiper.isBeginning, swiper.isEnd);
      }}
      onDoubleClick={handleDoubleTap}
      className="h-full w-full overflow-hidden rounded-lg"
    >
      {items.map((item, idx) => (
        <SwiperSlide key={idx} className="h-full">
          <div
            className="flex h-full items-center justify-center"
            onClick={handleTap}
          >
            {item.type === "image" ? (
              <div className="swiper-zoom-container">
                <img
                  src={item.src}
                  alt=""
                  className="max-h-full w-full object-contain"
                />
              </div>
            ) : (
              <video
                src={item.src}
                controls
                className="max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
