import { useState, useEffect, useRef } from "react";
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
  FolderInput,
  MoreHorizontal,
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
import { Fragment } from "react";
import { EmojiPicker } from "./emoji-picker";

interface NavFoldersProps {
  currentFolderId: string;
}

export function NavFolders({ currentFolderId }: NavFoldersProps) {
  const { language } = useUserContextV2();
  const { isMobile } = useSidebar();
  const { data: folders } = useFoldersInParent(currentFolderId);
  const { isArchiveMode, setCurrentFolderId } = useAppState();

  const updateFolderMutation = useUpdateFolder();
  const changeEmoji = (folder: Folder, emoji: string) => {
    return updateFolderMutation.mutateAsync({
      id: folder.id,
      data: { payload: { ...folder.payload, emoji } },
    });
  };
  const archiveFolder = (folderId: string) => {
    return updateFolderMutation.mutateAsync({
      id: folderId,
      data: { isArchived: 1 },
    });
  };
  const restoreFolder = async (folderId: string) => {
    const folder = await flomoDatabase.getFolder(folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }
    const parentFolder = flomoDatabase.getFolder(folder.parentId);
    if (!parentFolder) {
      // If parent folder doesn't exist (e.g. has been deleted), restore to root
      return updateFolderMutation.mutateAsync({
        id: folderId,
        data: { parentId: RootFolderId, isArchived: 0 },
      });
    }
    return updateFolderMutation.mutateAsync({
      id: folderId,
      data: { isArchived: 0 },
    });
  };

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

  if (isArchiveMode) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{i18nText[language].folders}</SidebarGroupLabel>
        <SidebarMenu>
          {folders
            ?.sort((a, b) => a.title.localeCompare(b.title))
            .map((folder) => (
              <SidebarMenuItem key={folder.id} className="cursor-pointer">
                <SidebarMenuButton
                  asChild
                  className="gap-0"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div>
                    <span className="mr-1 rounded-sm px-1 text-base">
                      {folder.payload.emoji || "📂"}
                    </span>

                    <span>{folder.title}</span>
                  </div>
                </SidebarMenuButton>
                {folder.isArchived === 1 && (
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
                        onClick={() => restoreFolder(folder.id)}
                      >
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
      <SidebarGroup>
        <SidebarGroupLabel>{i18nText[language].folders}</SidebarGroupLabel>
        <SidebarMenu>
          {folders
            ?.sort((a, b) => a.title.localeCompare(b.title))
            .map((folder) => (
              <SidebarMenuItem key={folder.id} className="cursor-pointer">
                <SidebarMenuButton
                  asChild
                  className="gap-0"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div>
                    <EmojiPicker
                      onSelectEmoji={(emoji) => {
                        return changeEmoji(folder, emoji);
                      }}
                    >
                      <span className="hover:bg-emoji-accent mr-1 rounded-sm px-1 text-base">
                        {folder.payload.emoji || "📂"}
                      </span>
                    </EmojiPicker>

                    <span>{folder.title}</span>
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
                      onClick={() => {
                        setRenamingFolder(folder);
                        setRenameDialogOpen(true);
                      }}
                    >
                      <TextCursorInput className="text-muted-foreground" />
                      <span>{i18nText[language].rename}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMovingFolder(folder);
                        setMoveDialogOpen(true);
                      }}
                    >
                      <FolderInput className="text-muted-foreground" />
                      <span>{i18nText[language].move}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-yellow-700 focus:text-yellow-700 dark:text-yellow-600 dark:focus:text-yellow-600"
                      onClick={() => archiveFolder(folder.id)}
                    >
                      <Archive className="text-yellow-700 dark:text-yellow-600" />
                      <span>{i18nText[language].archive}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setDeletingFolder(folder);
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

  const moveFolder = () => {
    return updateFolderMutation.mutateAsync({
      id: folder!.id,
      data: { parentId: navigateFolderId },
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
