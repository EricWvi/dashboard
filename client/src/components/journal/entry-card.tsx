import { EntryMeta, useEntry } from "@/hooks/use-entries";
import { ImageList } from "@/components/journal/image-list";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, More, MoreArrow } from "@/components/journal/icon";
import { useDraft } from "@/hooks/use-draft";
import { generateHTML, type JSONContent } from "@tiptap/react";

import { extensionSetup } from "@/components/tiptap-templates/simple/simple-editor";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

import { MediaViewer } from "./media-viewer";
import { EntryCardMenuHeight, DropdownMenu } from "./dropdown-menu";

const filterText = (doc: JSONContent) => {
  return {
    ...doc,
    content: doc.content?.filter(
      (node) => node.type !== "image" && node.type !== "video",
    ),
  };
};

const extractMediaItems = (content: JSONContent) => {
  return (
    content.content
      ?.filter((node) => node.type === "image" || node.type === "video")
      .map((node) => ({
        src: node.attrs?.src as string,
        type: node.type as "image" | "video",
      })) ?? []
  );
};

const monthToText = [
  { [UserLangEnum.ENUS]: "January", [UserLangEnum.ZHCN]: "一月" },
  { [UserLangEnum.ENUS]: "February", [UserLangEnum.ZHCN]: "二月" },
  { [UserLangEnum.ENUS]: "March", [UserLangEnum.ZHCN]: "三月" },
  { [UserLangEnum.ENUS]: "April", [UserLangEnum.ZHCN]: "四月" },
  { [UserLangEnum.ENUS]: "May", [UserLangEnum.ZHCN]: "五月" },
  { [UserLangEnum.ENUS]: "June", [UserLangEnum.ZHCN]: "六月" },
  { [UserLangEnum.ENUS]: "July", [UserLangEnum.ZHCN]: "七月" },
  { [UserLangEnum.ENUS]: "August", [UserLangEnum.ZHCN]: "八月" },
  { [UserLangEnum.ENUS]: "September", [UserLangEnum.ZHCN]: "九月" },
  { [UserLangEnum.ENUS]: "October", [UserLangEnum.ZHCN]: "十月" },
  { [UserLangEnum.ENUS]: "November", [UserLangEnum.ZHCN]: "十一月" },
  { [UserLangEnum.ENUS]: "December", [UserLangEnum.ZHCN]: "十二月" },
];

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDate = (date: Date | string, language: UserLang) => {
  if (language === UserLangEnum.ENUS) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  return new Date(date)
    .toLocaleDateString("zh-CN", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .replace("星期", " 星期");
};

interface EntryCardProps {
  meta: EntryMeta;
  showYear: boolean;
  showMonth: boolean;
  showToday: boolean;
  showYesterday: boolean;
}

export default function EntryCard({
  meta,
  showYear,
  showMonth,
  showToday,
  showYesterday,
}: EntryCardProps) {
  const { language } = useUserContext();
  const { data: entry } = useEntry(meta.id);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    top: 0,
    left: 0,
  });
  const textCardRef = useRef<HTMLDivElement>(null);
  const entryCardRef = useRef<HTMLDivElement>(null);

  const { data: draft } = useDraft(meta.draft);

  // Memoize expensive operations
  const mediaItems = useMemo(
    () => (draft ? extractMediaItems(draft.content as JSONContent) : []),
    [draft],
  );

  const textContent = useMemo(
    () => (draft ? filterText(draft.content) : null),
    [draft],
  );

  const handleOpenContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!entryCardRef.current) return;

    const cardRect = entryCardRef.current.getBoundingClientRect();
    const menuWidth = 240; // matches CSS width
    const padding = 30;

    // Calculate initial position (right-aligned to button)
    let top = cardRect.bottom - padding - EntryCardMenuHeight;
    let left = cardRect.right - menuWidth;

    // Check if menu would go off the bottom of screen
    // if (bottom + menuHeight > window.innerHeight) {
    //   bottom = cardRect.top - menuHeight - padding;
    // }

    // Check if menu would go off the left of screen (when right-aligned)
    // if (window.innerWidth - right - menuWidth < padding) {
    //   right = padding;
    // }

    setContextMenuPosition({ top, left });
    setContextMenuOpen(true);
  };

  const collapseHeight = 144; // Default height when collapsed

  useEffect(() => {
    if (entry && textCardRef.current) {
      if (textCardRef.current.scrollHeight > collapseHeight) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    }
  }, [entry]);

  // Close context menu when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (e: MouseEvent) => {
  //     if (
  //       contextMenuOpen &&
  //       entryCardRef.current &&
  //       !entryCardRef.current.contains(e.target as Node)
  //     ) {
  //       setContextMenuOpen(false);
  //     }
  //   };

  //   if (contextMenuOpen) {
  //     document.addEventListener("mousedown", handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, [contextMenuOpen]);

  useEffect(() => {
    if (textCardRef.current) {
      textCardRef.current.style.maxHeight = expanded
        ? textCardRef.current.scrollHeight + "px"
        : collapseHeight + "px";
    }
  }, [expanded]);

  if (!entry || !draft) return null;

  return (
    <>
      {showMonth && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          {monthToText[meta.month - 1][language]}
          {showYear && ", " + meta.year}
        </h3>
      )}
      {showToday && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          {i18nText[language].today}
        </h3>
      )}
      {showYesterday && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          {i18nText[language].yesterday}
        </h3>
      )}

      {/* entry card */}
      <div
        ref={entryCardRef}
        className="entry-card-shadow bg-entry-card mb-4 flex flex-col overflow-hidden rounded-xl transition-shadow hover:shadow-md"
      >
        {/* TODO picture loading css animation */}
        <div className="my-1 px-1">
          {/* Thumbnail trigger */}
          <ImageList
            items={mediaItems}
            onItemClick={(index) => {
              setCurrentSlideIndex(index);
              setViewerOpen(true);
            }}
          />

          {/* Media Viewer */}
          <MediaViewer
            items={mediaItems}
            isOpen={viewerOpen}
            currentSlideIndex={currentSlideIndex}
            setCurrentSlideIndex={setCurrentSlideIndex}
            onClose={() => setViewerOpen(false)}
          />
        </div>

        {/* text content */}
        <div
          ref={textCardRef}
          className={`relative mx-4 my-3 overflow-hidden transition-all duration-500 ease-in-out`}
          onClick={() => setExpanded(!expanded)}
        >
          <div
            className={`${hasMore && !expanded ? "opacity-100 delay-500" : "opacity-0"} absolute right-0 bottom-[1px] flex h-5 w-5 items-center justify-center transition-opacity duration-100`}
          >
            <div className="more-arrow-blur relative">
              <Icon className="relative z-10 h-[14px] w-[14px]">
                <MoreArrow />
              </Icon>
            </div>
          </div>
          <div
            className="text-foreground leading-6 font-normal"
            dangerouslySetInnerHTML={{
              __html: textContent
                ? generateHTML(textContent, extensionSetup)
                : "",
            }}
          ></div>
        </div>

        {/* footer */}
        <div className="border-border mx-1 flex items-center justify-between border-t px-3 py-1">
          <div className="flex-1">
            <div className="text-more-arrow flex items-center space-x-1 text-xs">
              <span>{formatDate(entry.createdAt, language)}</span>
              <span>· {formatTime(entry.createdAt)}</span>
            </div>
          </div>
          <div onClick={handleOpenContextMenu} className="cursor-pointer">
            <Icon className="h-5 w-5">
              <More className="fill-more-arrow" />
            </Icon>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: `${contextMenuPosition.top}px`,
            left: `${contextMenuPosition.left}px`,
            zIndex: 1000,
          }}
        >
          <DropdownMenu meta={meta} />
        </div>
      )}
    </>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    today: "今天",
    yesterday: "昨天",
  },
  [UserLangEnum.ENUS]: {
    today: "Today",
    yesterday: "Yesterday",
  },
};
