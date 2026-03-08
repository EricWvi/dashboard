import { CardHeader } from "./card-header";
import { CardContent } from "./card-content";

import { FlomoHome } from "./home-page";
import { useEditorState } from "@/hooks/use-editor-state";
import { TableOfContents } from "@/components/tiptap-node/toc-node";

const FLOMO_TOC_CLASS =
  "tiptap-toc scrollbar-hide absolute top-[10%] right-2 z-[100] w-[250px] max-h-[70vh] overflow-y-auto overflow-x-hidden hidden xl:block";

export function CardPane() {
  const { activeTabId } = useEditorState();

  if (!activeTabId) {
    return <FlomoHome />;
  }

  return (
    <>
      <CardHeader />
      <div className="relative flex-1 overflow-hidden">
        <div id="flomo-scroll-container" className="h-full overflow-y-auto">
          <CardContent />
        </div>
        <TableOfContents
          dependency={activeTabId}
          scrollContainerId="flomo-scroll-container"
          className={FLOMO_TOC_CLASS}
        />
      </div>
    </>
  );
}
