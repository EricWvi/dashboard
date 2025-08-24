import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useEditor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { TOCItem } from "./toc-extension";
import { getScrollBehavior, getTOCItems } from "./toc-extension";
import "./toc.scss";

interface TOCProps {
  editor: ReturnType<typeof useEditor>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const TableOfContents: React.FC<TOCProps> = ({ editor, scrollRef }) => {
  const scrollBehavior = useMemo(() => getScrollBehavior(editor), [editor]);
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);
  const tocRef = useRef<HTMLDivElement>(null);

  // Function to update TOC items from ProseMirror state
  const updateTOCFromState = useCallback(() => {
    if (!editor) return;
    const newItems = getTOCItems(editor);
    setItems(newItems);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Initial update
    updateTOCFromState();

    // Listen to editor updates (transactions)
    const handleUpdate = () => {
      updateTOCFromState();
    };

    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("transaction", handleUpdate);
    };
  }, [editor, updateTOCFromState]);

  const updateActiveHeading = () => {
    const container = scrollRef.current;
    if (container) {
      const headings = document.querySelectorAll("[data-toc-id]");
      const visibleHeadings = Array.from(headings).filter((heading) => {
        const rect = heading.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return rect.top <= containerRect.top + container.clientHeight * 0.2;
      });
      if (visibleHeadings.length > 0) {
        const lastVisible = visibleHeadings[visibleHeadings.length - 1];
        const tocId = lastVisible.getAttribute("data-toc-id");
        if (tocId) {
          setActiveId(tocId);
          document
            .getElementById(`toc-item-${tocId}`)
            ?.scrollIntoView({ behavior: scrollBehavior, block: "center" });
        }
      } else {
        setActiveId("");
        tocRef.current?.scrollTo({
          top: 0,
          behavior: scrollBehavior,
        });
      }
    }
  };

  useEffect(() => {
    if (!items.length || !scrollRef.current) return;

    const interval = setInterval(() => {
      updateActiveHeading();
    }, 500);

    return () => clearInterval(interval);
  }, [items]);

  const scrollToHeading = (item: TOCItem) => {
    if (!editor) return;

    const element = document.querySelector<HTMLElement>(
      `[data-toc-id="${item.id}"]`,
    );
    if (!element) return;

    const container = scrollRef.current;
    if (container) {
      // Calculate element position relative to container
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const offset = rect.top - containerRect.top;

      // Target scrollTop = element position - 20% of container height
      // add small offset to handle toc active item highlight issue, i.e. 10
      const targetY =
        container.scrollTop + offset - container.clientHeight * 0.2 + 10;

      container.scrollTo({
        top: targetY,
        behavior: scrollBehavior,
      });

      // Place cursor at the end of the heading
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
          editor.view.focus();
        }
      }, 300);
    }
  };

  const getItemOpacity = (item: TOCItem) => {
    if (isHovered) return 1;

    if (!activeId) return 0;

    // If this is the active item, full opacity
    if (item.id === activeId) return 1;

    // Check if this item is a parent of the active item
    const activeItem = items.find((i) => i.id === activeId);
    if (!activeItem) return 0;

    // If this item is a parent (lower level number) and comes before the active item
    if (item.level < activeItem.level && item.pos < activeItem.pos) {
      // Check if there's no other heading of the same or lower level between this and active
      const itemsBetween = items.filter(
        (i) =>
          i.pos > item.pos && i.pos < activeItem.pos && i.level <= item.level,
      );
      if (itemsBetween.length === 0) return 1;
    }

    return 0;
  };

  if (!items.length) return null;

  return (
    <div
      ref={tocRef}
      className="tiptap-toc"
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
