import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useIsMobile } from "@/hooks/use-mobile";

export type MediaItem = {
  type: "image" | "video";
  src: string;
};

interface MediaSwiperProps {
  items: MediaItem[];
}

export function MediaSwiper({ items }: MediaSwiperProps) {
  const isMobile = useIsMobile();
  return (
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={30}
      pagination={{ clickable: true }}
      navigation={!isMobile}
      className="h-full w-full overflow-hidden rounded-lg"
    >
      {items.map((item, idx) => (
        <SwiperSlide key={idx} className="flex items-center justify-center">
          {item.type === "image" ? (
            <img
              src={item.src}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              src={item.src}
              controls
              className="h-full w-full object-contain"
            />
          )}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
