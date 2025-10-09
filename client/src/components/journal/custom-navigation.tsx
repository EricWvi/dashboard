import type { Swiper } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CustomNavigationProps {
  swiper: Swiper | null;
  isBeginning: boolean;
  isEnd: boolean;
}

export function CustomNavigation({
  swiper,
  isBeginning,
  isEnd,
}: CustomNavigationProps) {
  const isMobile = useIsMobile();
  const handlePrev = () => {
    if (swiper && !isBeginning) {
      swiper.slidePrev();
    }
  };

  const handleNext = () => {
    if (swiper && !isEnd) {
      swiper.slideNext();
    }
  };

  if (isMobile) return null;

  return (
    <>
      {/* Previous Button */}
      <button
        onClick={handlePrev}
        disabled={isBeginning}
        className={`fixed top-1/2 left-6 z-50 -translate-y-1/2 transform rounded-full bg-black/50 p-3 text-white/90 transition-all duration-200 hover:bg-black/60 hover:text-white ${
          isBeginning
            ? "cursor-not-allowed opacity-30 hover:bg-black/50 hover:text-white/90"
            : "cursor-pointer hover:scale-105"
        }`}
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={isEnd}
        className={`fixed top-1/2 right-6 z-50 -translate-y-1/2 transform rounded-full bg-black/50 p-3 text-white/90 transition-all duration-200 hover:bg-black/60 hover:text-white ${
          isEnd
            ? "cursor-not-allowed opacity-30 hover:bg-black/50 hover:text-white/90"
            : "cursor-pointer hover:scale-105"
        }`}
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </>
  );
}
