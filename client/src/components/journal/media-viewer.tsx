import { useState } from "react";
import { MediaSwiper } from "./media-swiper";
import { CustomPagination } from "./custom-pagination";
import { CustomNavigation } from "./custom-navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Swiper as SwiperType } from "swiper";

interface MediaItem {
  src: string;
  type: "image" | "video";
}

interface MediaViewerProps {
  items: MediaItem[];
  isOpen: boolean;
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  onClose: () => void;
}

export function MediaViewer({
  items,
  isOpen,
  currentSlideIndex,
  setCurrentSlideIndex,
  onClose,
}: MediaViewerProps) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-100 cursor-pointer rounded-full bg-black/50 p-2 text-white/90 transition-colors hover:text-gray-300"
        aria-label="Close"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Fullscreen viewer */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Semi-transparent overlay */}
          <div className="absolute inset-0 bg-black/80" />

          {/* Swiper container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 h-[80vh] w-[90vw] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaSwiper
              items={items}
              initialSlide={currentSlideIndex}
              onClose={onClose}
              onSlideChange={setCurrentSlideIndex}
              onSwiperInit={setSwiper}
              onNavigationChange={(beginning, end) => {
                setIsBeginning(beginning);
                setIsEnd(end);
              }}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Custom Pagination - outside AnimatePresence to avoid animation issues */}
      <CustomPagination
        total={items.length}
        activeIndex={currentSlideIndex}
        swiper={swiper}
      />

      {/* Custom Navigation */}
      <CustomNavigation
        isBeginning={isBeginning}
        isEnd={isEnd}
        swiper={swiper}
        show={items.length > 1}
      />
    </>
  );
}
