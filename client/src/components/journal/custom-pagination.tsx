import type { Swiper } from "swiper";

interface CustomPaginationProps {
  total: number;
  activeIndex: number;
  swiper: Swiper | null;
}

export function CustomPagination({
  total,
  activeIndex,
  swiper,
}: CustomPaginationProps) {
  if (total <= 1) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 transform items-center space-x-2">
      {[...Array(total)].map((_, index) => (
        <button
          key={index}
          className={`size-2 cursor-pointer rounded-full transition-all duration-300 ${
            index === activeIndex
              ? "scale-125 bg-white"
              : "bg-white/50 hover:bg-white/70"
          }`}
          onClick={() => swiper?.slideTo(index)}
        />
      ))}
    </div>
  );
}
