import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  FolderInput,
  MoreHorizontal,
  Sparkles,
  Star,
  StarOff,
  TextCursorInput,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useCardsInFolder, useUpdateCard } from "@/hooks/flomo/use-cards";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { RootFolderId, type Card } from "@/lib/flomo/model";
import {
  folderTransitionVariants,
  folderTransition,
} from "@/lib/flomo/animations";
import { EmojiPicker } from "./emoji-picker";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useEditorState } from "@/hooks/use-editor-state";
import {
  RenameCardDialog,
  MoveCardDialog,
  DeleteCardDialog,
} from "./card-dialogs";
import { cn, isTouchDevice } from "@/lib/utils";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { generateKeyBetween } from "fractional-indexing";

interface NavCardsProps {
  currentFolderId: string;
}

export function NavCards({ currentFolderId }: NavCardsProps) {
  const { language } = useUserContextV2();

  const { data: cards } = useCardsInFolder(currentFolderId);

  const updateCardMutation = useUpdateCard();

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingCard, setRenamingCard] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingCard, setMovingCard] = useState<Omit<Card, "rawText"> | null>(
    null,
  );

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const sortedCards = cards
    ?.slice()
    .sort((a, b) =>
      (a.payload.sortOrder ?? "").localeCompare(b.payload.sortOrder ?? ""),
    );

  // Monitor for drag-and-drop reordering
  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !sortedCards) return;

        const sourceType = source.data.type as string;
        const targetType = target.data.type as string;

        // Handle card reorder
        if (sourceType === "card" && targetType === "card") {
          const sourceId = source.data.id as string;
          const targetId = target.data.id as string;
          if (sourceId === targetId) return;

          const edge = extractClosestEdge(target.data);
          const targetIndex = sortedCards.findIndex((c) => c.id === targetId);
          if (targetIndex === -1) return;

          const sourceCard = sortedCards.find((c) => c.id === sourceId);
          if (!sourceCard) return;

          let before: string | null;
          let after: string | null;
          if (edge === "top") {
            before =
              targetIndex > 0
                ? sortedCards[targetIndex - 1].payload.sortOrder
                : null;
            after = sortedCards[targetIndex].payload.sortOrder;
          } else {
            before = sortedCards[targetIndex].payload.sortOrder;
            after =
              targetIndex < sortedCards.length - 1
                ? sortedCards[targetIndex + 1].payload.sortOrder
                : null;
          }

          const newSortOrder = generateKeyBetween(before, after);
          updateCardMutation.mutate({
            id: sourceId,
            data: {
              payload: { ...sourceCard.payload, sortOrder: newSortOrder },
            },
          });
        }
      },
    });
  }, [sortedCards, updateCardMutation]);

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{i18nText[language].cards}</SidebarGroupLabel>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolderId}
            variants={folderTransitionVariants}
            initial="initial"
            animate="animate"
            transition={folderTransition}
          >
            <SidebarMenu>
              {sortedCards?.map((card) => (
                <DraggableCardItem
                  key={card.id}
                  card={card}
                  onRename={() => {
                    setRenamingCard(card);
                    setRenameDialogOpen(true);
                  }}
                  onMove={() => {
                    setMovingCard(card);
                    setMoveDialogOpen(true);
                  }}
                  onDelete={() => {
                    setDeletingCard(card);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </SidebarMenu>
          </motion.div>
        </AnimatePresence>
      </SidebarGroup>

      <RenameCardDialog
        open={renameDialogOpen}
        setOpen={setRenameDialogOpen}
        card={renamingCard!}
      />
      <MoveCardDialog
        open={moveDialogOpen}
        setOpen={setMoveDialogOpen}
        card={movingCard!}
      />
      <DeleteCardDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        card={deletingCard!}
      />
    </>
  );
}

// ─── DraggableCardItem ────────────────────────────────────────────────

interface DraggableCardItemProps {
  card: Omit<Card, "rawText">;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function DraggableCardItem({
  card,
  onRename,
  onMove,
  onDelete,
}: DraggableCardItemProps) {
  const { isMobile, toggleSidebar } = useSidebar();
  const { language } = useUserContextV2();
  const { setCardIdForDraft } = useAppState();
  const { activeTabId, openTab, closeTab } = useEditorState();

  const updateCardMutation = useUpdateCard();

  const changeEmoji = (emoji: string) => {
    return updateCardMutation.mutateAsync({
      id: card.id,
      data: { payload: { ...card.payload, emoji } },
    });
  };
  const archiveCard = () => {
    return updateCardMutation
      .mutateAsync({ id: card.id, data: { isArchived: 1 } })
      .then(() => closeTab(card.draft));
  };
  const bookmarkCard = () => {
    return updateCardMutation.mutateAsync({
      id: card.id,
      data: { isBookmarked: card.isBookmarked === 1 ? 0 : 1 },
    });
  };
  const restoreCard = async () => {
    const parentFolder = await flomoDatabase.getFolder(card.folderId);
    if (!parentFolder) {
      return updateCardMutation.mutateAsync({
        id: card.id,
        data: { isArchived: 0, folderId: RootFolderId },
      });
    }
    return updateCardMutation.mutateAsync({
      id: card.id,
      data: { isArchived: 0 },
    });
  };
  const openCard = () => {
    openTab({
      draftId: card.draft,
      title: card.title,
      editable: false,
    });
    setCardIdForDraft(card.draft, card.id);
    if (isMobile) toggleSidebar();
  };

  const itemRef = useRef<HTMLLIElement>(null);
  const dragHandleRef = useRef<HTMLSpanElement>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = itemRef.current;
    const handle = dragHandleRef.current;
    if (!el || !handle) return;

    return combine(
      draggable({
        element: el,
        dragHandle: handle,
        getInitialData: () => ({
          type: "card",
          id: card.id,
          sortOrder: card.payload.sortOrder,
          payload: card.payload,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) =>
          attachClosestEdge(
            {
              type: "card",
              id: card.id,
              sortOrder: card.payload.sortOrder,
            },
            { input, element, allowedEdges: ["top", "bottom"] },
          ),
        canDrop: ({ source }) =>
          source.data.type === "card" && source.data.id !== card.id,
        onDragEnter: ({ self }) =>
          setClosestEdge(extractClosestEdge(self.data)),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [card.id, card.payload.sortOrder, card.payload]);

  const isActive = activeTabId === card.draft;

  return (
    <SidebarMenuItem
      ref={itemRef}
      className={cn(
        "relative cursor-pointer",
        isDragging && "opacity-50",
      )}
    >
      {closestEdge === "top" && (
        <div className="bg-primary pointer-events-none absolute top-0 right-0 left-0 h-0.5" />
      )}
      <SidebarMenuButton
        asChild
        className={cn(
          "gap-0",
          isActive
            ? "bg-tab-highlight hover:bg-tab-highlight/30 dark:hover:bg-tab-highlight/70 shadow-sm"
            : "",
        )}
        onClick={openCard}
      >
        <div>
          <EmojiPicker
            onSelectEmoji={(emoji) => {
              return changeEmoji(emoji);
            }}
          >
            <span className="hover:bg-emoji-accent mr-1 rounded-sm px-1 text-base">
              {card.payload.emoji || "📄"}
            </span>
          </EmojiPicker>

          <span ref={dragHandleRef} className="cursor-grab">
            {card.title}
          </span>
          {card.isBookmarked === 1 && (
            <Sparkles className="text-muted-foreground ml-1 -translate-y-[1px]" />
          )}
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover={isTouchDevice ? false : true}
          >
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48"
          side={isMobile ? "bottom" : "right"}
          align={isMobile ? "end" : "start"}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuItem onClick={bookmarkCard}>
            {card.isBookmarked === 1 ? (
              <>
                <StarOff className="text-muted-foreground" />
                <span>{i18nText[language].unbookmark}</span>
              </>
            ) : (
              <>
                <Star className="text-muted-foreground" />
                <span>{i18nText[language].bookmark}</span>
              </>
            )}
          </DropdownMenuItem>
          {card.isArchived === 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={onRename}>
            <TextCursorInput className="text-muted-foreground" />
            <span>{i18nText[language].rename}</span>
          </DropdownMenuItem>
          {card.isArchived === 0 && (
            <>
              <DropdownMenuItem onClick={onMove}>
                <FolderInput className="text-muted-foreground" />
                <span>{i18nText[language].move}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {card.isArchived === 0 ? (
            <DropdownMenuItem
              className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
              onClick={archiveCard}
            >
              <Archive className="text-yellow-700 dark:text-yellow-600" />
              <span>{i18nText[language].archive}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={restoreCard}>
              <ArchiveRestore className="text-muted-foreground" />
              <span>{i18nText[language].restore}</span>
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
      {closestEdge === "bottom" && (
        <div className="bg-primary pointer-events-none absolute right-0 bottom-0 left-0 h-0.5" />
      )}
    </SidebarMenuItem>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    rename: "重命名",
    move: "移动",
    archive: "归档",
    delete: "删除",
    cards: "卡片",
    restore: "恢复",
    bookmark: "收藏",
    unbookmark: "取消收藏",
  },
  [UserLangEnum.ENUS]: {
    rename: "Rename",
    move: "Move",
    archive: "Archive",
    delete: "Delete",
    cards: "Cards",
    restore: "Restore",
    bookmark: "Bookmark",
    unbookmark: "Unbookmark",
  },
};
