import { UserLangEnum } from "@/hooks/use-user";
import { Icon, Search, More } from "./icon";
import Stats from "./stats";
import { useEffect, useRef, useState } from "react";
import { useUserContext } from "@/user-provider";
import EntryCalendar from "./entry-calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";
import { ToolbarMenu } from "./dropdown-menu";

interface HeaderProps {
  onSearch: (query: string) => void;
  onBookmarkFilter: () => void;
  onDateFilter: (date: string) => void;
}

export default function Header(props: HeaderProps) {
  const isMobile = useIsMobile();
  const { language } = useUserContext();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [toolbarMenuOpen, setToolbarMenuOpen] = useState(false);
  const [toolbarMenuPosition, setToolbarMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const [toolbarMenuOrigin, setToolbarMenuOrigin] = useState({ x: 0, y: 0 });
  const moreIconRef = useRef<HTMLDivElement>(null);

  const onSearchToggle = () => {
    setShowSearchInput(true);
  };

  const onSearch = (query: string) => {
    props.onSearch(query);
    setShowSearchInput(false);
  };

  const onCancel = () => {
    setShowSearchInput(false);
  };

  const handleOpenToolbarMenu = () => {
    if (!moreIconRef.current) return;

    const iconRect = moreIconRef.current.getBoundingClientRect();
    const menuWidth = 240; // matches CSS width

    // Calculate initial position (right-aligned to button)
    const left = iconRect.right - menuWidth;

    // Check if menu is too top
    const top = iconRect.bottom + 8;
    setToolbarMenuOrigin({ x: iconRect.right, y: top });

    setToolbarMenuPosition({ top, left });
    setToolbarMenuOpen(true);
  };

  return (
    <header>
      <Toolbar
        onSearchToggle={onSearchToggle}
        setToolbarMenuOpen={setToolbarMenuOpen}
        setToolbarMenuPosition={setToolbarMenuPosition}
        setToolbarMenuOrigin={setToolbarMenuOrigin}
      />
      <div className="mx-auto space-y-2 px-4 sm:px-6 lg:px-8">
        <div className="mt-10 flex h-12 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-foreground text-3xl font-bold">
              {i18nText[language].journal}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div
              onClick={onSearchToggle}
              className="bg-search-icon flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
            >
              <Icon className="h-5 w-5">
                <Search />
              </Icon>
            </div>
            <div
              ref={moreIconRef}
              onClick={handleOpenToolbarMenu}
              className="bg-search-icon flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
            >
              <Icon className="h-5 w-5">
                <More />
              </Icon>
            </div>
          </div>
        </div>

        <div onClick={() => setShowCalendar(!showCalendar)}>
          <Stats />
        </div>

        {(!isMobile || showCalendar) && (
          <div className="mt-6 sm:mt-8 sm:mb-6">
            <EntryCalendar onDateClick={props.onDateFilter} />
          </div>
        )}
      </div>

      {showSearchInput && (
        <SearchInput onSearch={onSearch} onCancel={onCancel} />
      )}

      {/* Toolbar Menu */}
      <AnimatePresence>
        {toolbarMenuOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              transition: {
                type: "spring",
                damping: 20,
                stiffness: 300,
                mass: 0.8,
              },
            }}
            exit={{
              scale: 0,
              transition: {
                duration: 0.15,
                ease: "easeOut",
              },
            }}
            style={{
              transformOrigin: `${toolbarMenuOrigin.x}px ${toolbarMenuOrigin.y}px`,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <ToolbarMenu
              position={toolbarMenuPosition}
              onClose={() => setToolbarMenuOpen(false)}
              onBookmarkFilter={props.onBookmarkFilter}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

interface ToolbarProps {
  onSearchToggle: () => void;
  setToolbarMenuOpen: (open: boolean) => void;
  setToolbarMenuPosition: (pos: { top: number; left: number }) => void;
  setToolbarMenuOrigin: (origin: { x: number; y: number }) => void;
}

function Toolbar({
  onSearchToggle,
  setToolbarMenuOpen,
  setToolbarMenuPosition,
  setToolbarMenuOrigin,
}: ToolbarProps) {
  const { language } = useUserContext();
  const [opacity, setOpacity] = useState(0);
  const moreIconRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = document.querySelector("#scrollableDiv");
    if (!container) return;

    const handleScroll = () => {
      const scrollY = (container as HTMLElement).scrollTop;
      if (scrollY <= 80) {
        setOpacity(0);
      } else if (scrollY >= 100) {
        setOpacity(1);
      } else {
        const ratio = (scrollY - 80) / (100 - 80);
        setOpacity(ratio);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenToolbarMenu = () => {
    if (!moreIconRef.current) return;

    const iconRect = moreIconRef.current.getBoundingClientRect();
    const menuWidth = 240; // matches CSS width

    // Calculate initial position (right-aligned to button)
    const left = iconRect.right - menuWidth;

    // Check if menu is too top
    const top = iconRect.bottom + 8;
    setToolbarMenuOrigin({ x: iconRect.right, y: top });

    setToolbarMenuPosition({ top, left });
    setToolbarMenuOpen(true);
  };

  return (
    <div
      className={`toolbar-after apple-backdrop bg-tool-bar fixed top-0 right-0 left-0 z-50 h-auto shrink-0 transition-opacity duration-300 ${opacity > 0.6 ? "" : "pointer-events-none"}`}
      style={{ opacity }}
    >
      <div className="mx-auto max-w-4xl px-3 sm:px-5 lg:px-7">
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-foreground text-lg font-semibold">
              {i18nText[language].journal}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div
              className="bg-toolbar-icon flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
              onClick={onSearchToggle}
            >
              <Icon className="h-4 w-4">
                <Search />
              </Icon>
            </div>
            <div
              ref={moreIconRef}
              onClick={handleOpenToolbarMenu}
              className="bg-toolbar-icon flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
            >
              <Icon className="h-4 w-4">
                <More />
              </Icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchInput({
  onSearch,
  onCancel,
}: {
  onSearch: (query: string) => void;
  onCancel: () => void;
}) {
  const { language } = useUserContext();
  const [query, setQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="journal-bg fixed inset-0 z-1000">
      <div className="mx-auto max-w-2xl">
        <div className="mt-4 flex items-center gap-3 px-2 py-2 sm:mt-8">
          <div className="relative flex flex-1 items-center">
            <div className="absolute left-3 flex items-center opacity-40">
              <div className="h-4 w-4">
                <Search />
              </div>
            </div>
            <input
              id="journal-search-input"
              type="text"
              className="text-foreground w-full rounded-lg bg-gray-200 px-10 py-2 text-base placeholder:text-gray-400 focus:ring-0 focus:outline-none dark:bg-gray-800"
              placeholder={i18nText[language].searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  onSearch(query);
                }
              }}
              autoFocus
            />
          </div>

          <button
            className="text-search-button-text shrink-0 cursor-pointer px-3 py-2 font-medium"
            onClick={onCancel}
          >
            {i18nText[language].cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    journal: "手记",
    searchPlaceholder: "搜索手记内容",
    cancel: "取消",
  },
  [UserLangEnum.ENUS]: {
    journal: "Journal",
    searchPlaceholder: "Search journal entries",
    cancel: "Cancel",
  },
};
