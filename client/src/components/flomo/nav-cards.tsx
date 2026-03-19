import { useState, useEffect, useRef, Fragment } from "react";
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
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
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
    .sort((a, b) => (a.payload.sortOrder < b.payload.sortOrder ? -1 : 1));

  // Monitor for drag-and-drop reordering
  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !sortedCards) return;

        const sourceType = source.data.type as string;
        const targetType = target.data.type as string;

        // Handle card reorder
        if (sourceType === "card" && targetType === "card-drop-zone") {
          const sourceId = source.data.id as string;
          const sourceCard = sortedCards.find((c) => c.id === sourceId);
          if (!sourceCard) return;

          const newSortOrder = target.data.sortOrder as string;
          if (newSortOrder === sourceCard.payload.sortOrder) return;
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
            <SidebarMenu className="gap-0">
              {sortedCards?.map((card, index) => (
                <Fragment key={card.id}>
                  {index === 0 && (
                    <CardDropZone
                      prevOrder={null}
                      nextOrder={card.payload.sortOrder}
                      prevId={null}
                      nextId={card.id}
                    />
                  )}
                  <DraggableCardItem
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
                  <CardDropZone
                    prevOrder={card.payload.sortOrder}
                    nextOrder={
                      sortedCards[index + 1]?.payload.sortOrder ?? null
                    }
                    prevId={card.id}
                    nextId={sortedCards[index + 1]?.id ?? null}
                  />
                </Fragment>
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
    updateCardMutation
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
    );
  }, [card.id, card.payload.sortOrder, card.payload]);

  const isActive = activeTabId === card.draft;

  return (
    <SidebarMenuItem
      ref={itemRef}
      className={cn("relative cursor-pointer", isDragging && "opacity-50")}
    >
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
          <SidebarMenuAction showOnHover={isTouchDevice ? false : true}>
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
    </SidebarMenuItem>
  );
}

interface CardDropZoneProps {
  prevOrder: string | null;
  nextOrder: string | null;
  prevId: string | null;
  nextId: string | null;
}

function CardDropZone({
  prevOrder,
  nextOrder,
  prevId,
  nextId,
}: CardDropZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const sortOrder = generateKeyBetween(prevOrder, nextOrder);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({
        type: "card-drop-zone",
        sortOrder,
      }),
      canDrop: ({ source }) =>
        source.data.type === "card" &&
        source.data.id !== prevId &&
        source.data.id !== nextId,
      onDragEnter: () => setIsActive(true),
      onDrag: () => setIsActive(true),
      onDragLeave: () => setIsActive(false),
      onDrop: () => setIsActive(false),
    });
  }, [sortOrder, prevId, nextId]);

  return (
    <li className="relative h-1 list-none">
      <div ref={zoneRef} className="absolute -top-0.5 right-0 left-0 h-2" />
      {isActive && (
        <div className="bg-primary pointer-events-none absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2" />
      )}
    </li>
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
