import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EditorToolbar } from "@/components/tiptap-editor/simple-editor";
import { useAppState } from "@/hooks/flomo/use-app-state";
import {
  saveDraft,
  syncDraft,
  getHistory,
  listHistory,
  restoreHistory,
} from "@/hooks/flomo/use-tiptapv2";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CardHeader() {
  const { activeTabId, getTabEditable, setTabEditable, getInitialContent } =
    useAppState();

  if (!activeTabId) return null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="text-muted-foreground -ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {getTabEditable(activeTabId) ? (
          <EditorToolbar
            draftId={activeTabId}
            saveDraft={saveDraft}
            syncDraft={syncDraft}
            getInitialContent={getInitialContent}
            listHistory={listHistory}
            getHistory={getHistory}
            restoreHistory={restoreHistory}
          />
        ) : (
          <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7"
            onClick={() => setTabEditable(activeTabId, true)}
          >
            <PenLine />
          </Button>
        )}
      </div>
    </header>
  );
}
