import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  FolderInput,
  MoreHorizontal,
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
  i18nText,
} from "./card-dialogs";

interface NavCardsProps {
  currentFolderId: string;
}

export function NavCards({ currentFolderId }: NavCardsProps) {
  const { isMobile } = useSidebar();
  const { language } = useUserContextV2();

  const { data: cards } = useCardsInFolder(currentFolderId);
  const { isArchiveMode } = useAppState();
  const { openTab } = useEditorState();

  const updateCardMutation = useUpdateCard();
  const changeEmoji = (card: Card, emoji: string) => {
    return updateCardMutation.mutateAsync({
      id: card.id,
      data: { payload: { ...card.payload, emoji } },
    });
  };
  const archiveCard = (cardId: string) => {
    return updateCardMutation.mutateAsync({
      id: cardId,
      data: { isArchived: 1 },
    });
  };
  const bookmarkCard = (cardId: string) => {
    return updateCardMutation.mutateAsync({
      id: cardId,
      data: { isBookmarked: 1 },
    });
  };
  const unbookmarkCard = (cardId: string) => {
    return updateCardMutation.mutateAsync({
      id: cardId,
      data: { isBookmarked: 0 },
    });
  };
  const restoreCard = async (cardId: string) => {
    const card = await flomoDatabase.getCard(cardId);
    if (!card) {
      throw new Error("Card not found");
    }
    const parentFolder = await flomoDatabase.getFolder(card.folderId);
    if (!parentFolder) {
      // If parent folder is deleted, restore card to root folder
      return updateCardMutation.mutateAsync({
        id: cardId,
        data: { isArchived: 0, folderId: RootFolderId },
      });
    }
    return updateCardMutation.mutateAsync({
      id: cardId,
      data: { isArchived: 0 },
    });
  };
  const openCard = (card: Card) => {
    // Simply open tab with null instance
    // Content will be loaded from IndexedDB by EditorProvider
    openTab({
      draftId: card.draft,
      title: card.title,
      editable: false,
      cardId: card.id,
    });
  };

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingCard, setRenamingCard] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingCard, setMovingCard] = useState<Card | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState<{
    id: string;
    title: string;
  } | null>(null);

  if (isArchiveMode) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{navCardsI18n[language].cards}</SidebarGroupLabel>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolderId}
            variants={folderTransitionVariants}
            initial="initial"
            animate="animate"
            transition={folderTransition}
          >
            <SidebarMenu>
              {cards
                ?.sort((a, b) => b.createdAt - a.createdAt)
                .map((card) => (
                  <SidebarMenuItem key={card.id} className="cursor-pointer">
                    <SidebarMenuButton asChild className="gap-0">
                      <div>
                        <span className="mr-1 rounded-sm px-1 text-base">
                          {card.payload.emoji || "📄"}
                        </span>

                        <span>{card.title}</span>
                      </div>
                    </SidebarMenuButton>
                    {card.isArchived === 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
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
                          <DropdownMenuItem
                            onClick={() => restoreCard(card.id)}
                          >
                            <TextCursorInput className="text-muted-foreground" />
                            <span>{navCardsI18n[language].restore}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </motion.div>
        </AnimatePresence>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{navCardsI18n[language].cards}</SidebarGroupLabel>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolderId}
            variants={folderTransitionVariants}
            initial="initial"
            animate="animate"
            transition={folderTransition}
          >
            <SidebarMenu>
              {cards
                ?.sort((a, b) => b.createdAt - a.createdAt)
                .map((card) => (
                  <SidebarMenuItem key={card.id} className="cursor-pointer">
                    <SidebarMenuButton
                      asChild
                      className="gap-0"
                      onClick={() => openCard(card)}
                    >
                      <div>
                        <EmojiPicker
                          onSelectEmoji={(emoji) => {
                            return changeEmoji(card, emoji);
                          }}
                        >
                          <span className="hover:bg-emoji-accent mr-1 rounded-sm px-1 text-base">
                            {card.payload.emoji || "📄"}
                          </span>
                        </EmojiPicker>

                        <span>{card.title}</span>
                      </div>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
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
                        <DropdownMenuItem
                          onClick={() =>
                            card.isBookmarked === 1
                              ? unbookmarkCard(card.id)
                              : bookmarkCard(card.id)
                          }
                        >
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setRenamingCard(card);
                            setRenameDialogOpen(true);
                          }}
                        >
                          <TextCursorInput className="text-muted-foreground" />
                          <span>{i18nText[language].rename}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setMovingCard(card);
                            setMoveDialogOpen(true);
                          }}
                        >
                          <FolderInput className="text-muted-foreground" />
                          <span>{i18nText[language].move}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
                          onClick={() => archiveCard(card.id)}
                        >
                          <Archive className="text-yellow-700 dark:text-yellow-600" />
                          <span>{i18nText[language].archive}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setDeletingCard(card);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="text-destructive" />
                          <span>{i18nText[language].delete}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
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

const navCardsI18n = {
  [UserLangEnum.ZHCN]: {
    cards: "卡片",
    restore: "恢复",
  },
  [UserLangEnum.ENUS]: {
    cards: "Cards",
    restore: "Restore",
  },
};
