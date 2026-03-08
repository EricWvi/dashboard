import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useCurrentEditor, Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { TOCItem } from "./toc-extension";
import { getScrollBehavior, getTOCItems } from "./toc-extension";
import {
  getScrollBehaviorV2,
  getTOCItemsV2,
  tocV2PluginKey,
} from "./toc-extension-v2";
import "./toc.scss";

// ---------------------------------------------------------------------------
// Auto-detect which TOC extension version the editor is using.
// V2 is preferred; V1 is the fallback for backward compatibility.
// ---------------------------------------------------------------------------
function isV2Active(editor: Editor): boolean {
  return tocV2PluginKey.getState(editor.state) !== undefined;
}

function getItems(editor: Editor): TOCItem[] {
  return isV2Active(editor) ? getTOCItemsV2(editor) : getTOCItems(editor);
}

function getBehavior(editor: Editor): ScrollBehavior {
  return isV2Active(editor)
    ? getScrollBehaviorV2(editor)
    : getScrollBehavior(editor);
}

const DEFAULT_TOC_CLASS =
  "tiptap-toc scrollbar-hide fixed top-[20vh] right-[1rem] z-[1000] w-[250px] max-h-[60vh] overflow-y-auto overflow-x-hidden hidden xl:block";

interface TOCProps {
  editor?: Editor | null;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  scrollContainerId?: string;
  dependency?: any;
  /** Override the default fixed-position class. Use this for non-fullscreen layouts. */
  className?: string;
}

export const TableOfContents: React.FC<TOCProps> = ({
  editor: propEditor,
  scrollRef,
  scrollContainerId,
  dependency,
  className,
}) => {
  const { editor: currentEditor } = useCurrentEditor() || {};
  const editor = propEditor || currentEditor;

  const scrollBehavior = useMemo(
    () => (editor ? getBehavior(editor) : "smooth"),
    [editor],
  );
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const activeIdRef = useRef(activeId);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(isHovered);
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // ---- Item Loading ----
  // Read TOC items from plugin state. Retries on dependency change to handle
  // async content loads (IndexedDB) where the editor state isn't ready yet.
  useEffect(() => {
    if (!editor) return;

    // Reset on dependency change so stale items don't linger
    setItems([]);
    setActiveId("");

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let retryCount = 0;
    const MAX_RETRIES = 20; // up to 2 seconds

    const readItems = () => {
      if (cancelled) return;
      const newItems = getItems(editor);
      if (newItems.length > 0) {
        setItems(newItems);
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        retryTimer = setTimeout(readItems, 100);
      }
    };

    // Initial read after a microtask so updateState has been applied
    retryTimer = setTimeout(readItems, 50);

    const handleUpdate = () => {
      if (cancelled) return;
      const newItems = getItems(editor);
      setItems(newItems);
    };

    editor.on("transaction", handleUpdate);
    editor.on("update", handleUpdate);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      editor.off("transaction", handleUpdate);
      editor.off("update", handleUpdate);
    };
  }, [editor, dependency]);

  const getScrollContainer = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current;
    if (scrollContainerId)
      return document.getElementById(scrollContainerId) as HTMLElement | null;
    return null;
  }, [scrollRef, scrollContainerId]);

  // ---- Active Heading Tracking (scroll-event based) ----
  const updateActiveHeading = useCallback(() => {
    const container = getScrollContainer();
    if (!container) return;

    // Scope heading query to within the scroll container
    const headings = container.querySelectorAll(
      ".simple-editor-content [data-toc-id]",
    );
    const containerRect = container.getBoundingClientRect();
    const threshold = containerRect.top + container.clientHeight * 0.2;

    const visibleHeadings = Array.from(headings).filter((heading) => {
      const rect = heading.getBoundingClientRect();
      return rect.top <= threshold;
    });

    if (visibleHeadings.length > 0) {
      const lastVisible = visibleHeadings[visibleHeadings.length - 1];
      const tocId = lastVisible.getAttribute("data-toc-id");
      if (tocId && tocId !== activeIdRef.current) {
        setActiveId(tocId);
        // Scroll the TOC sidebar itself to keep active item visible
        const tocItem = document.getElementById(`toc-item-${tocId}`);
        if (tocItem && tocRef.current) {
          const tocRect = tocRef.current.getBoundingClientRect();
          const itemRect = tocItem.getBoundingClientRect();
          const offsetTop =
            itemRect.top -
            tocRect.top +
            tocRef.current.scrollTop -
            tocRef.current.clientHeight / 2;
          tocRef.current.scrollTo({
            top: Math.max(0, offsetTop),
            behavior: scrollBehavior,
          });
        }
      }
    } else {
      if (activeIdRef.current !== "") {
        setActiveId("");
        tocRef.current?.scrollTo({ top: 0, behavior: scrollBehavior });
      }
    }
  }, [getScrollContainer, scrollBehavior]);

  // Listen to scroll events on the container (much more responsive than polling)
  useEffect(() => {
    const container = getScrollContainer();
    if (!container || !items.length) return;

    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!isHoveredRef.current) {
          updateActiveHeading();
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount / items change to set initial active heading
    handleScroll();

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [items, getScrollContainer, updateActiveHeading]);

  const scrollToHeading = (item: TOCItem) => {
    if (!editor) return;

    const container = getScrollContainer();
    if (!container) return;

    const element = container.querySelector<HTMLElement>(
      `[data-toc-id="${item.id}"]`,
    );
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = rect.top - containerRect.top;
    const targetY =
      container.scrollTop + offset - container.clientHeight * 0.2 + 10;

    container.scrollTo({ top: targetY, behavior: scrollBehavior });

    setTimeout(() => {
      const { tr } = editor.state;
      const headingNode = tr.doc.nodeAt(item.pos);
      if (headingNode) {
        const endPos = item.pos + headingNode.nodeSize - 1;
        const resolvedPos = tr.doc.resolve(
          Math.min(endPos, tr.doc.content.size),
        );
        const selection = TextSelection.create(tr.doc, resolvedPos.pos);
        editor.view.dispatch(tr.setSelection(selection));
        if (editor.isEditable) {
          editor.view.focus();
        }
      }
    }, 300);
  };

  const getItemOpacity = (item: TOCItem) => {
    if (isHovered) return 1;
    // When no heading has scrolled past the threshold yet, show all items
    if (!activeId) return 0.6;
    if (item.id === activeId) return 1;

    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return 0;

    if (item.level < activeItem.level && item.pos < activeItem.pos) {
      const itemsBetween = items.filter(
        (i) =>
          i.pos > item.pos && i.pos < activeItem.pos && i.level <= item.level,
      );
      if (itemsBetween.length === 0) return 1;
    }

    return 0;
  };

  if (!items.length || !editor) return null;

  return (
    <div
      ref={tocRef}
      className={className ?? DEFAULT_TOC_CLASS}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`tiptap-toc-item tiptap-toc-level-${item.level} ${
            item.id === activeId ? "tiptap-toc-active" : ""
          }`}
        >
          <div className="toc-item-circle"></div>
          <div
            id={`toc-item-${item.id}`}
            className="toc-item-title"
            style={{ opacity: getItemOpacity(item) }}
            onClick={() => scrollToHeading(item)}
          >
            {item.text}
          </div>
        </div>
      ))}
    </div>
  );
};
