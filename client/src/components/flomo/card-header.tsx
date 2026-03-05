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
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { tiptapRefresh } from "@/hooks/flomo/query-keys";

export function CardHeader() {
  const { activeTabId, getTabEditable, setTabEditable, getInitialContent } =
    useAppState();

  const handleClose = useCallback(() => {
    if (activeTabId) {
      setTabEditable(activeTabId, false);
    }
  }, [activeTabId, setTabEditable]);

  const handleSave = useCallback(
    async (e: Editor) => {
      if (activeTabId) {
        await saveDraft({
          id: activeTabId,
          content: e.getJSON() as Record<string, unknown>,
        });
        tiptapRefresh(activeTabId);
      }
    },
    [activeTabId],
  );

  const handleDrop = useCallback(async () => {
    if (activeTabId) {
      const content = getInitialContent(activeTabId);
      if (content) {
        await syncDraft({ id: activeTabId, content });
        tiptapRefresh(activeTabId);
      }
    }
  }, [activeTabId, getInitialContent]);

  const handleRestoreHistory = useCallback(
    async (ts: number) => {
      if (activeTabId) {
        await restoreHistory(activeTabId, ts);
        tiptapRefresh(activeTabId);
      }
    },
    [activeTabId],
  );

  const handleListHistory = useCallback(async () => {
    if (activeTabId) {
      return await listHistory(activeTabId);
    }
    return [];
  }, [activeTabId]);

  const handleGetHistory = useCallback(
    async (ts: number) => {
      if (activeTabId) {
        return await getHistory(activeTabId, ts);
      }
      return null;
    },
    [activeTabId],
  );

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
            onClose={handleClose}
            onSave={handleSave}
            onDrop={handleDrop}
            listHistory={handleListHistory}
            getHistory={handleGetHistory}
            restoreHistory={handleRestoreHistory}
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
