import { useTTContext } from "@/components/editor";
import { TableOfContents } from "@/components/tiptap-node/toc-node";
import {
  EditorToolbar,
  SimpleEditor,
} from "@/components/tiptap-editor/simple-editor";
import { useEditorState } from "@/hooks/use-editor-state";
import {
  getHistory,
  listHistory,
  restoreHistory,
  saveDraft,
  syncDraft,
} from "@/hooks/journal/use-tiptapv2";
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useUpdateEntry } from "@/hooks/journal/use-entryv2";
import { useAppState } from "@/hooks/journal/use-app-state";
import { tiptapRefresh } from "@/hooks/journal/query-keys";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";

export const EntryEditor = () => {
  const { open } = useTTContext();
  const { activeTabId } = useEditorState();

  if (!open || !activeTabId) return null;

  return (
    <div className="fixed inset-0 z-50 flex transform-gpu flex-col">
      <EditorHeader />
      <div className="bg-tt-background relative flex-1 overflow-hidden">
        <div id="only-tt-scroll-container" className="h-full overflow-y-auto">
          <div className="transform-gpu">
            <SimpleEditor />
          </div>
        </div>
        <EditorToc />
      </div>
    </div>
  );
};

const EditorHeader = () => {
  const { language } = useUserContextV2();
  const updateEntryMutation = useUpdateEntry();
  const { open } = useTTContext();
  const { activeTabId, getTabEditable, setTabEditable, getInitialContent } =
    useEditorState();
  const { getEntryIdByDraftId } = useAppState();

  const activeEntry = activeTabId
    ? getEntryIdByDraftId(activeTabId)
    : undefined;
  const entryId = activeEntry ?? "";

  const handleClose = useCallback(
    (e: Editor, changed: boolean) => {
      if (activeTabId) {
        setTabEditable(activeTabId, false);
        if (changed) {
          let str = e.getText().trim().replace(/\s+/g, " ");
          updateEntryMutation.mutate({
            id: entryId,
            data: { rawText: str },
          });
        }
      }
    },
    [activeTabId, entryId, setTabEditable],
  );

  const handleSave = useCallback(
    async (e: Editor) => {
      if (activeTabId) {
        await saveDraft({
          id: activeTabId,
          content: e.getJSON(),
        });
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

  if (!open || !activeTabId) return null;

  const isEditing = getTabEditable(activeTabId);

  return (
    <div className="bg-tt-background flex h-16 shrink-0">
      <div className="flex min-w-0 flex-1 items-center">
        {isEditing ? (
          <EditorToolbar
            onClose={handleClose}
            onSave={handleSave}
            onDrop={handleDrop}
            listHistory={handleListHistory}
            getHistory={handleGetHistory}
            restoreHistory={handleRestoreHistory}
          />
        ) : (
          <div className="flex justify-between">
            <div className="text-lg font-semibold">Preview</div>
            <button
              onClick={() => setTabEditable(activeTabId, true)}
              className="border-tt-foreground/20 text-tt-foreground hover:bg-tt-foreground/10 rounded border px-3 py-1 text-sm transition-colors"
            >
              {i18nText[language].edit}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const EditorToc = () => {
  const { activeTabId } = useEditorState();

  if (!activeTabId) return null;

  return (
    <TableOfContents
      dependency={activeTabId}
      scrollContainerId="only-tt-scroll-container"
      className="tiptap-toc scrollbar-hide absolute top-[12%] right-20 z-[10] hidden max-h-[60%] w-[250px] overflow-x-hidden overflow-y-auto transition-[right] ease-linear 2xl:block"
    />
  );
};

const i18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
  },
};
