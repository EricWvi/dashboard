import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EditorToolbar } from "@/components/tiptap-editor/simple-editor";
import { useEditorState } from "@/hooks/use-editor-state";
import {
  saveDraft,
  syncDraft,
  getHistory,
  listHistory,
  restoreHistory,
} from "@/hooks/flomo/use-tiptapv2";
import {
  Archive,
  ArchiveRestore,
  FolderInput,
  Menu,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { tiptapRefresh } from "@/hooks/flomo/query-keys";
import { useCard, useUpdateCard } from "@/hooks/flomo/use-cards";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { RootFolderId, type Card } from "@/lib/flomo/model";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RenameCardDialog,
  MoveCardDialog,
  DeleteCardDialog,
} from "./card-dialogs";
import { StarFilledIcon, StarOutlineIcon } from "./icons";
import { useAppState } from "@/hooks/flomo/use-app-state";

export function CardHeader() {
  const {
    activeTabId,
    closeTab,
    getTabEditable,
    setTabEditable,
    getInitialContent,
  } = useEditorState();
  const { getCardIdByDraftId } = useAppState();
  const { language } = useUserContextV2();

  const activeCard = activeTabId ? getCardIdByDraftId(activeTabId) : undefined;
  const cardId = activeCard ?? "";
  const { data: card } = useCard(cardId);

  const updateCardMutation = useUpdateCard();

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

  const toggleBookmark = useCallback(() => {
    if (card) {
      updateCardMutation.mutate({
        id: card.id,
        data: { isBookmarked: card.isBookmarked === 1 ? 0 : 1 },
      });
    }
  }, [card, updateCardMutation]);

  const archiveCard = useCallback(() => {
    if (card) {
      updateCardMutation.mutate({
        id: card.id,
        data: { isArchived: 1 },
      });
      closeTab(activeTabId!);
    }
  }, [card, updateCardMutation]);

  const restoreCard = useCallback(async () => {
    if (!card) return;
    const parentFolder = await flomoDatabase.getFolder(card.folderId);
    if (!parentFolder) {
      updateCardMutation.mutate({
        id: card.id,
        data: { isArchived: 0, folderId: RootFolderId },
      });
    } else {
      updateCardMutation.mutate({
        id: card.id,
        data: { isArchived: 0 },
      });
    }
  }, [card, updateCardMutation]);

  // Dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!activeTabId) return null;

  const isEditing = getTabEditable(activeTabId);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="text-muted-foreground -ml-1" />
          {isEditing ? (
            <>
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <EditorToolbar
                onClose={handleClose}
                onSave={handleSave}
                onDrop={handleDrop}
                listHistory={handleListHistory}
                getHistory={handleGetHistory}
                restoreHistory={handleRestoreHistory}
              />
            </>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              {/* Star / Bookmark button */}
              <BookmarkButton
                isBookmarked={card?.isBookmarked === 1}
                onClick={toggleBookmark}
              />

              {/* Edit button */}
              <Button
                className={cn(
                  "text-background h-8 rounded-sm px-3 text-sm font-medium",
                  "bg-[#30D07A] hover:bg-[#28b86c] active:bg-[#22a05e]",
                  "dark:bg-[#28b86c] dark:hover:bg-[#22a05e] dark:active:bg-[#1c8a50]",
                )}
                onClick={() => setTabEditable(activeTabId, true)}
              >
                {i18nText[language].edit}
              </Button>

              {/* More button */}
              <MoreMenu
                card={card}
                onRename={() => setRenameDialogOpen(true)}
                onMove={() => setMoveDialogOpen(true)}
                onArchive={archiveCard}
                onRestore={restoreCard}
                onDelete={() => setDeleteDialogOpen(true)}
              />
            </div>
          )}
        </div>
      </header>

      {card && (
        <>
          <RenameCardDialog
            open={renameDialogOpen}
            setOpen={setRenameDialogOpen}
            card={card}
          />
          <MoveCardDialog
            open={moveDialogOpen}
            setOpen={setMoveDialogOpen}
            card={card}
          />
          <DeleteCardDialog
            open={deleteDialogOpen}
            setOpen={setDeleteDialogOpen}
            card={card}
          />
        </>
      )}
    </>
  );
}

// ─── BookmarkButton ──────────────────────────────────────────────────
function BookmarkButton({
  isBookmarked,
  onClick,
}: {
  isBookmarked: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-8"
      onClick={onClick}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isBookmarked ? "filled" : "empty"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {isBookmarked ? (
            <StarFilledIcon className="size-5 text-[rgb(237,170,6)] dark:text-[rgb(210,167,56)]" />
          ) : (
            <StarOutlineIcon className="size-5" />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}

// ─── MoreMenu ────────────────────────────────────────────────────────
function MoreMenu({
  card,
  onRename,
  onMove,
  onArchive,
  onRestore,
  onDelete,
}: {
  card: Card | undefined;
  onRename: () => void;
  onMove: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { language } = useUserContextV2();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="text-muted-foreground mb-[1px] ml-1 size-8"
        >
          <Menu className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48"
        align="end"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem onClick={onRename}>
          <TextCursorInput className="text-muted-foreground" />
          <span>{i18nText[language].rename}</span>
        </DropdownMenuItem>
        {card?.isArchived === 0 && (
          <>
            <DropdownMenuItem onClick={onMove}>
              <FolderInput className="text-muted-foreground" />
              <span>{i18nText[language].move}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {card?.isArchived === 1 ? (
          <DropdownMenuItem onClick={onRestore}>
            <ArchiveRestore className="text-muted-foreground" />
            <span>{i18nText[language].restore}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
            onClick={onArchive}
          >
            <Archive className="text-yellow-700 dark:text-yellow-600" />
            <span>{i18nText[language].archive}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="text-destructive" />
          <span>{i18nText[language].delete}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    rename: "重命名",
    move: "移动",
    archive: "归档",
    delete: "删除",
    restore: "恢复",
    edit: "编辑",
  },
  [UserLangEnum.ENUS]: {
    rename: "Rename",
    move: "Move",
    archive: "Archive",
    delete: "Delete",
    restore: "Restore",
    edit: "Edit",
  },
};
