import { Fragment, useEffect, useRef, useState } from "react";
import {
  Archive,
  FolderInput,
  MoreHorizontal,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import {
  useCardsInFolder,
  useUpdateCard,
  useDeleteCard,
} from "@/hooks/flomo/use-cards";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { RootFolderId, type Card, type Folder } from "@/lib/flomo/model";
import { EmojiPicker } from "./emoji-picker";
import { useFolderPath } from "@/hooks/flomo/use-folders";
import { useAppState } from "@/hooks/flomo/use-app-state";

interface NavCardsProps {
  currentFolderId: string;
}

export function NavCards({ currentFolderId }: NavCardsProps) {
  const { isMobile } = useSidebar();
  const { language } = useUserContextV2();

  const { data: cards } = useCardsInFolder(currentFolderId);
  const { isArchiveMode, openTab } = useAppState();

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
  const restoreCard = (cardId: string) => {
    return updateCardMutation.mutateAsync({
      id: cardId,
      data: { isArchived: 0 },
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
        <SidebarGroupLabel>{i18nText[language].cards}</SidebarGroupLabel>
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
                    >
                      <DropdownMenuItem onClick={() => restoreCard(card.id)}>
                        <TextCursorInput className="text-muted-foreground" />
                        <span>{i18nText[language].restore}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{i18nText[language].cards}</SidebarGroupLabel>
        <SidebarMenu>
          {cards
            ?.sort((a, b) => b.createdAt - a.createdAt)
            .map((card) => (
              <SidebarMenuItem key={card.id} className="cursor-pointer">
                <SidebarMenuButton
                  asChild
                  className="gap-0"
                  onClick={() =>
                    openTab({
                      cardId: card.id,
                      draftId: card.draft,
                      title: card.title,
                      readMode: true,
                    })
                  }
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
                  >
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

interface RenameCardDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  card: { id: string; title: string };
}

function RenameCardDialog({ open, setOpen, card }: RenameCardDialogProps) {
  const { language } = useUserContextV2();
  const [isComposing, setIsComposing] = useState(false);
  const [cardName, setCardName] = useState("");

  const updateCardMutation = useUpdateCard();

  const renameCard = () => {
    return updateCardMutation.mutateAsync({
      id: card.id,
      data: { title: cardName },
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCardName(card.title);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].renameCard}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={i18nText[language].cardNamePlaceholder}
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                renameCard().then(() => setOpen(false));
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {i18nText[language].cancel}
            </Button>
            <Button
              onClick={() => {
                renameCard().then(() => setOpen(false));
              }}
              disabled={!cardName.trim() || updateCardMutation.isPending}
            >
              {i18nText[language].confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MoveCardDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  card: Card | null;
}

function MoveCardDialog({ open, setOpen, card }: MoveCardDialogProps) {
  const { language } = useUserContextV2();
  const [navigateFolderId, setNavigateFolderId] = useState("");
  const { data: path } = useFolderPath(navigateFolderId);
  const [foldersInParent, setFoldersInParent] = useState<Folder[]>([]);

  const updateCardMutation = useUpdateCard();

  useEffect(() => {
    if (open) {
      setNavigateFolderId(card?.folderId || RootFolderId);
    } else {
      setNavigateFolderId("");
    }
  }, [open]);

  // Fetch folders in current navigation parent on the fly
  useEffect(() => {
    if (open) {
      flomoDatabase.getFoldersInParent(navigateFolderId).then((folders) => {
        setFoldersInParent(folders);
      });
    }
  }, [navigateFolderId]);

  const scrollRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({
        left: container.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [path]);

  const moveCard = () => {
    return updateCardMutation.mutateAsync({
      id: card!.id,
      data: { folderId: navigateFolderId },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].moveCard}</DialogTitle>
          <DialogDescription>
            {i18nText[language].moveCardDescription.replace(
              "{card}",
              card?.title || "",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList
              ref={scrollRef}
              className="flex-nowrap overflow-x-auto whitespace-nowrap"
            >
              <BreadcrumbItem
                className="cursor-pointer"
                onClick={() => setNavigateFolderId(RootFolderId)}
              >
                {navigateFolderId === RootFolderId ? (
                  <BreadcrumbPage>{i18nText[language].home}</BreadcrumbPage>
                ) : (
                  i18nText[language].home
                )}
              </BreadcrumbItem>
              {path?.map((segment, index) => (
                <Fragment key={index}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem
                    className="cursor-pointer"
                    onClick={() => setNavigateFolderId(segment.id)}
                  >
                    {index === path.length - 1 ? (
                      <BreadcrumbPage>{segment.title}</BreadcrumbPage>
                    ) : (
                      segment.title
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Folder List */}
          <div className="h-48 overflow-y-auto rounded-md border">
            {foldersInParent.length === 0 ? (
              <div className="flex h-full flex-col">
                <div className="text-muted-foreground my-auto p-4 text-center text-sm">
                  {i18nText[language].emptyFolder}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {foldersInParent
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((f) => (
                    <button
                      key={f.id}
                      className="hover:bg-accent flex items-center gap-2 px-4 py-2 text-left"
                      onClick={() => setNavigateFolderId(f.id)}
                    >
                      <span>{f.payload.emoji || "📂"}</span>
                      <span>{f.title}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {i18nText[language].cancel}
            </Button>
            <Button
              onClick={() => {
                moveCard().then(() => setOpen(false));
              }}
              disabled={updateCardMutation.isPending}
            >
              {i18nText[language].move}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteCardDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  card: { id: string; title: string } | null;
}

function DeleteCardDialog({ open, setOpen, card }: DeleteCardDialogProps) {
  const { language } = useUserContextV2();
  const deleteCardMutation = useDeleteCard();

  const deleteCard = () => {
    return deleteCardMutation.mutateAsync(card!.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].deleteCard}</DialogTitle>
          <DialogDescription>
            {i18nText[language].deleteCardDescription.replace(
              "{card}",
              card?.title || "",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteCardMutation.isPending}
          >
            {i18nText[language].cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteCard().then(() => setOpen(false));
            }}
            disabled={deleteCardMutation.isPending}
          >
            {i18nText[language].delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    cards: "卡片",
    rename: "重命名",
    move: "移动",
    archive: "归档",
    delete: "删除",
    restore: "恢复",
    renameCard: "重命名卡片",
    cardNamePlaceholder: "输入卡片名称",
    cancel: "取消",
    confirm: "确认",
    moveCard: "移动卡片",
    moveCardDescription: '将 "{card}" 移动到：',
    home: "根目录",
    emptyFolder: "此文件夹为空",
    deleteCard: "删除卡片",
    deleteCardDescription: '确定要删除 "{card}" 吗？',
  },
  [UserLangEnum.ENUS]: {
    cards: "Cards",
    rename: "Rename",
    move: "Move",
    archive: "Archive",
    delete: "Delete",
    restore: "Restore",
    renameCard: "Rename Card",
    cardNamePlaceholder: "Enter card name...",
    cancel: "Cancel",
    confirm: "Confirm",
    moveCard: "Move Card",
    moveCardDescription: 'Move "{card}" to:',
    home: "Home",
    emptyFolder: "This folder is empty",
    deleteCard: "Delete Card",
    deleteCardDescription: 'Are you sure you want to delete "{card}"?',
  },
};
