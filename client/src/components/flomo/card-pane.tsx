import { CardHeader } from "./card-header";
import { CardContent } from "./card-content";
import { FlomoHome } from "./home-page";
import { useEditorState } from "@/hooks/use-editor-state";
import { TableOfContents } from "@/components/tiptap-node/toc-node";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

export function CardPane() {
  const { activeTabId } = useEditorState();

  if (!activeTabId) {
    return <FlomoHome />;
  }

  return (
    <>
      <CardHeader />
      <div className="relative flex-1 overflow-hidden">
        <div id="only-tt-scroll-container" className="h-full overflow-y-auto">
          <CardContent />
        </div>
        <CardToc />
      </div>
    </>
  );
}

const FLOMO_TOC_CLASS =
  "tiptap-toc scrollbar-hide absolute top-[12%] right-20 z-[10] hidden max-h-[60%] w-[250px] overflow-x-hidden overflow-y-auto transition-[right] ease-linear 2xl:block";

const CardToc = () => {
  const { activeTabId } = useEditorState();
  const { open } = useSidebar();

  if (!activeTabId) return null;

  return (
    <TableOfContents
      dependency={activeTabId}
      scrollContainerId="only-tt-scroll-container"
      className={cn(FLOMO_TOC_CLASS, open && "right-1")}
    />
  );
};
