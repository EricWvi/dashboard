import { CardHeader } from "./card-header";
import { CardContent } from "./card-content";

import { FlomoHome } from "./home-page";
import { useEditorState } from "@/hooks/use-editor-state";

export function CardPane() {
  const { activeTabId } = useEditorState();

  if (!activeTabId) {
    return <FlomoHome />;
  }

  return (
    <>
      <CardHeader />
      <div className="flex-1 overflow-y-auto">
        <CardContent />
      </div>
    </>
  );
}
