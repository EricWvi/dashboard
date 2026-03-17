import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContextV2 } from "@/user-provider";
import {
  useFoldersInParent,
  useUpdateFolder,
  useDeleteFolder,
  useFolderPath,
} from "@/hooks/flomo/use-folders";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { RootFolderId, type Folder } from "@/lib/flomo/model";
import {
  folderTransitionVariants,
  folderTransition,
} from "@/lib/flomo/animations";
import { Fragment } from "react";
import { EmojiPicker } from "./emoji-picker";
import { cn, isTouchDevice } from "@/lib/utils";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { generateKeyBetween } from "fractional-indexing";

interface NavFoldersProps {
  currentFolderId: string;
}

export function NavFolders({ currentFolderId }: NavFoldersProps) {
  const { language } = useUserContextV2();
  const { data: folders } = useFoldersInParent(currentFolderId);

  const updateFolderMutation = useUpdateFolder();

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Move dialog state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingFolder, setMovingFolder] = useState<Folder | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const sortedFolders = folders
    ?.slice()
    .sort((a, b) => (a.payload.sortOrder < b.payload.sortOrder ? -1 : 1));

  // Monitor for drag-and-drop reordering
  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !sortedFolders) return;

        const sourceType = source.data.type as string;
        const targetType = target.data.type as string;

        // Handle folder reorder
        if (sourceType === "folder" && targetType === "folder-drop-zone") {
          const sourceId = source.data.id as string;
          const sourceFolder = sortedFolders.find((f) => f.id === sourceId);
          if (!sourceFolder) return;

          const newSortOrder = target.data.sortOrder as string;
          if (newSortOrder === sourceFolder.payload.sortOrder) return;
          updateFolderMutation.mutate({
            id: sourceId,
            data: {
              payload: { ...sourceFolder.payload, sortOrder: newSortOrder },
            },
          });
        }
      },
    });
  }, [sortedFolders, updateFolderMutation]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{i18nText[language].folders}</SidebarGroupLabel>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFolderId}
            variants={folderTransitionVariants}
            initial="initial"
            animate="animate"
            transition={folderTransition}
          >
            <SidebarMenu className="gap-0">
              {sortedFolders?.map((folder, index) => (
                <Fragment key={folder.id}>
                  {index === 0 && (
                    <FolderDropZone
                      prevOrder={null}
                      nextOrder={folder.payload.sortOrder}
                      prevId={null}
                      nextId={folder.id}
                    />
                  )}
                  <DraggableFolderItem
                    folder={folder}
                    onRename={() => {
                      setRenamingFolder(folder);
                      setRenameDialogOpen(true);
                    }}
                    onMove={() => {
                      setMovingFolder(folder);
                      setMoveDialogOpen(true);
                    }}
                    onDelete={() => {
                      setDeletingFolder(folder);
                      setDeleteDialogOpen(true);
                    }}
                  />
                  <FolderDropZone
                    prevOrder={folder.payload.sortOrder}
                    nextOrder={
                      sortedFolders[index + 1]?.payload.sortOrder ?? null
                    }
                    prevId={folder.id}
                    nextId={sortedFolders[index + 1]?.id ?? null}
                  />
                </Fragment>
              ))}
            </SidebarMenu>
          </motion.div>
        </AnimatePresence>
      </SidebarGroup>

      <RenameFolderDialog
        open={renameDialogOpen}
        setOpen={setRenameDialogOpen}
        folder={renamingFolder!}
      />
      <MoveFolderDialog
        open={moveDialogOpen}
        setOpen={setMoveDialogOpen}
        folder={movingFolder!}
      />
      <DeleteFolderDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        folder={deletingFolder!}
      />
    </>
  );
}

// ─── DraggableFolderItem ───────────────────────────────────────────────

interface DraggableFolderItemProps {
  folder: Folder;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function DraggableFolderItem({
  folder,
  onRename,
  onMove,
  onDelete,
}: DraggableFolderItemProps) {
  const { language } = useUserContextV2();
  const { isMobile } = useSidebar();
  const { setCurrentFolderId } = useAppState();

  const updateFolderMutation = useUpdateFolder();

  const changeEmoji = (emoji: string) => {
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { payload: { ...folder.payload, emoji } },
    });
  };
  const archiveFolder = () => {
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { isArchived: 1 },
    });
  };
  const bookmarkFolder = () => {
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { isBookmarked: folder.isBookmarked === 1 ? 0 : 1 },
    });
  };
  const restoreFolder = async () => {
    const parentFolder = await flomoDatabase.getFolder(folder.parentId);
    if (!parentFolder) {
      return updateFolderMutation.mutateAsync({
        id: folder.id,
        data: { parentId: RootFolderId, isArchived: 0 },
      });
    }
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { isArchived: 0 },
    });
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
          type: "folder",
          id: folder.id,
          sortOrder: folder.payload.sortOrder,
        }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
    );
  }, [folder.id, folder.payload.sortOrder]);

  return (
    <SidebarMenuItem
      ref={itemRef}
      className={cn("relative cursor-pointer", isDragging && "opacity-50")}
    >
      <SidebarMenuButton
        asChild
        className="gap-0"
        onClick={() => setCurrentFolderId(folder.id)}
      >
        <div>
          <EmojiPicker
            onSelectEmoji={(emoji) => {
              return changeEmoji(emoji);
            }}
          >
            <span className="hover:bg-emoji-accent mr-1 rounded-sm px-1 text-base">
              {folder.payload.emoji || "📂"}
            </span>
          </EmojiPicker>

          <span ref={dragHandleRef} className="cursor-grab">
            {folder.title}
          </span>
          {folder.isBookmarked === 1 && (
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
          <DropdownMenuItem onClick={bookmarkFolder}>
            {folder.isBookmarked === 1 ? (
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
          {folder.isArchived === 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={onRename}>
            <TextCursorInput className="text-muted-foreground" />
            <span>{i18nText[language].rename}</span>
          </DropdownMenuItem>
          {folder.isArchived === 0 && (
            <>
              <DropdownMenuItem onClick={onMove}>
                <FolderInput className="text-muted-foreground" />
                <span>{i18nText[language].move}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {folder.isArchived === 0 ? (
            <DropdownMenuItem
              className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
              onClick={archiveFolder}
            >
              <Archive className="text-yellow-700 dark:text-yellow-600" />
              <span>{i18nText[language].archive}</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={restoreFolder}>
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

interface FolderDropZoneProps {
  prevOrder: string | null;
  nextOrder: string | null;
  prevId: string | null;
  nextId: string | null;
}

function FolderDropZone({
  prevOrder,
  nextOrder,
  prevId,
  nextId,
}: FolderDropZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const sortOrder = generateKeyBetween(prevOrder, nextOrder);

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({
        type: "folder-drop-zone",
        sortOrder,
      }),
      canDrop: ({ source }) =>
        source.data.type === "folder" &&
        source.data.id !== prevId &&
        source.data.id !== nextId,
      onDragEnter: () => setIsActive(true),
      onDrag: () => setIsActive(true),
      onDragLeave: () => setIsActive(false),
      onDrop: () => setIsActive(false),
    });
  }, [sortOrder, prevId, nextId]);

  if (isTouchDevice) return <li className="h-1 list-none"></li>;

  return (
    <li className="relative h-1 list-none">
      <div ref={zoneRef} className="absolute -top-1 right-0 left-0 z-10 h-3" />

      {isActive && (
        <>
          <div className="bg-primary pointer-events-none absolute top-1/2 right-2 left-0 h-0.5 -translate-y-1/2" />
          <div className="bg-sidebar border-primary absolute top-1/2 size-2 -translate-y-1/2 rounded-full border-2" />
        </>
      )}
    </li>
  );
}

interface RenameFolderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  folder: { id: string; title: string };
}

function RenameFolderDialog({
  open,
  setOpen,
  folder,
}: RenameFolderDialogProps) {
  const { language } = useUserContextV2();
  const [isComposing, setIsComposing] = useState(false);
  const [folderName, setFolderName] = useState("");

  const updateFolderMutation = useUpdateFolder();

  const renameFolder = () => {
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { title: folderName },
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFolderName(folder.title);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].renameFolder}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={i18nText[language].folderNamePlaceholder}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                renameFolder().then(() => setOpen(false));
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
                renameFolder().then(() => setOpen(false));
              }}
              disabled={!folderName.trim() || updateFolderMutation.isPending}
            >
              {i18nText[language].confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MoveFolderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  folder: Folder | null;
}

function MoveFolderDialog({ open, setOpen, folder }: MoveFolderDialogProps) {
  const { language } = useUserContextV2();
  const [navigateFolderId, setNavigateFolderId] = useState("");
  const { data: path } = useFolderPath(navigateFolderId);
  const [foldersInParent, setFoldersInParent] = useState<Folder[]>([]);

  const updateFolderMutation = useUpdateFolder();

  useEffect(() => {
    if (open) {
      setNavigateFolderId(folder?.parentId || RootFolderId);
    } else {
      setNavigateFolderId("");
    }
  }, [open]);

  // Fetch folders in current navigation parent on the fly
  useEffect(() => {
    if (open) {
      flomoDatabase.getFoldersInParent(navigateFolderId).then((folders) => {
        // Filter out the folder being moved
        setFoldersInParent(folders.filter((f) => f.id !== folder?.id));
      });
    }
  }, [navigateFolderId]);

  const scrollRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({
        left: container.scrollWidth, // 滚向最右侧
        behavior: "smooth",
      });
    }
  }, [path]);

  const moveFolder = async () => {
    const lastOrder = await flomoDatabase.lastOrderInFolder(
      navigateFolderId,
      "folder",
    );
    const newSortOrder = generateKeyBetween(lastOrder, null);
    return updateFolderMutation.mutateAsync({
      id: folder!.id,
      data: {
        parentId: navigateFolderId,
        payload: { ...folder!.payload, sortOrder: newSortOrder },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].moveFolder}</DialogTitle>
          <DialogDescription>
            {i18nText[language].moveFolderDescription.replace(
              "{folder}",
              folder?.title || "",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList
              ref={scrollRef}
              className="scrollbar-hide flex-nowrap overflow-x-auto whitespace-nowrap"
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
                  .sort((a, b) =>
                    a.payload.sortOrder < b.payload.sortOrder ? -1 : 1,
                  )
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
                moveFolder().then(() => setOpen(false));
              }}
              disabled={updateFolderMutation.isPending}
            >
              {i18nText[language].move}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  folder: { id: string; title: string } | null;
}

function DeleteFolderDialog({
  open,
  setOpen,
  folder,
}: DeleteFolderDialogProps) {
  const { language } = useUserContextV2();
  const deleteFolderMutation = useDeleteFolder();

  const deleteFolder = () => {
    return deleteFolderMutation.mutateAsync(folder!.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].deleteFolder}</DialogTitle>
          <DialogDescription>
            {i18nText[language].deleteFolderDescription.replace(
              "{folder}",
              folder?.title || "",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteFolderMutation.isPending}
          >
            {i18nText[language].cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteFolder().then(() => setOpen(false));
            }}
            disabled={deleteFolderMutation.isPending}
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
    folders: "文件夹",
    rename: "重命名",
    move: "移动",
    archive: "归档",
    delete: "删除",
    restore: "恢复",
    bookmark: "收藏",
    unbookmark: "取消收藏",
    renameFolder: "重命名文件夹",
    folderNamePlaceholder: "输入文件夹名称",
    cancel: "取消",
    confirm: "确认",
    moveFolder: "移动文件夹",
    moveFolderDescription: '将 "{folder}" 移动到：',
    home: "根目录",
    emptyFolder: "此文件夹为空",
    deleteFolder: "删除文件夹",
    deleteFolderDescription: '确定要删除 "{folder}" 吗？',
  },
  [UserLangEnum.ENUS]: {
    folders: "Folders",
    rename: "Rename",
    move: "Move",
    archive: "Archive",
    delete: "Delete",
    restore: "Restore",
    bookmark: "Bookmark",
    unbookmark: "Unbookmark",
    renameFolder: "Rename Folder",
    folderNamePlaceholder: "Enter folder name...",
    cancel: "Cancel",
    confirm: "Confirm",
    moveFolder: "Move Folder",
    moveFolderDescription: 'Move "{folder}" to:',
    home: "Home",
    emptyFolder: "This folder is empty",
    deleteFolder: "Delete Folder",
    deleteFolderDescription: 'Are you sure you want to delete "{folder}"?',
  },
};
