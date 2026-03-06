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
  Ellipsis,
  FolderInput,
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
  i18nText,
} from "./card-dialogs";

export function CardHeader() {
  const { activeTabId, getTabEditable, setTabEditable, getInitialContent, getTabById } =
    useEditorState();
  const { language } = useUserContextV2();

  const activeTab = activeTabId ? getTabById(activeTabId) : undefined;
  const cardId = activeTab?.cardId ?? "";
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
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
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
            <div className="ml-auto flex items-center gap-1.5">
              {/* Star / Bookmark button */}
              <BookmarkButton
                isBookmarked={card?.isBookmarked === 1}
                onClick={toggleBookmark}
              />

              {/* Edit button */}
              <Button
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-medium text-white",
                  "bg-[#30D07A] hover:bg-[#28b86c] active:bg-[#22a05e]",
                  "dark:bg-[#28b86c] dark:hover:bg-[#22a05e] dark:active:bg-[#1c8a50]",
                )}
                onClick={() => setTabEditable(activeTabId, true)}
              >
                {i18nText[language].edit}
              </Button>

              {/* More button */}
              {card && (
                <MoreMenu
                  card={card}
                  onRename={() => setRenameDialogOpen(true)}
                  onMove={() => setMoveDialogOpen(true)}
                  onArchive={archiveCard}
                  onRestore={restoreCard}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              )}
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
      className="text-muted-foreground size-7"
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
            <StarFilledIcon className="size-4 text-yellow-500" />
          ) : (
            <StarOutlineIcon className="size-4" />
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
  card: Card;
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
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7"
        >
          <Ellipsis className="size-4" />
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
        <DropdownMenuItem onClick={onMove}>
          <FolderInput className="text-muted-foreground" />
          <span>{i18nText[language].move}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {card.isArchived === 1 ? (
          <DropdownMenuItem
            className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
            onClick={onRestore}
          >
            <Archive className="text-yellow-700 dark:text-yellow-600" />
            <span>{moreMenuI18n[language].restore}</span>
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

// ─── Star SVG Icons ──────────────────────────────────────────────────
function StarOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

const moreMenuI18n = {
  [UserLangEnum.ZHCN]: {
    restore: "恢复",
  },
  [UserLangEnum.ENUS]: {
    restore: "Restore",
  },
};
