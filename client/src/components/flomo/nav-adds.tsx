import { FolderPlus, Plus, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useEffect, useState } from "react";
import { useCreateCard } from "@/hooks/flomo/use-cards";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useCreateFolder } from "@/hooks/flomo/use-folders";

export function NavAdds() {
  const { language } = useUserContextV2();
  const { isArchiveMode, exitArchiveMode } = useAppState();
  const [addCardDialogOpen, setAddCardDialogOpen] = useState(false);
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useState(false);

  if (isArchiveMode) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem className="cursor-pointer">
              <SidebarMenuButton asChild onClick={() => exitArchiveMode()}>
                <div className="text-yellow-700 hover:text-yellow-700 active:text-yellow-700 dark:text-yellow-600 dark:hover:text-yellow-600 dark:active:text-yellow-600">
                  <LogOut />
                  <span>{i18nText[language].exitArchiveMode}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="px-0 py-2">
        <SidebarGroupContent>
          <SidebarMenu>
            {/* add card */}
            <SidebarMenuItem className="cursor-pointer">
              <SidebarMenuButton
                asChild
                onClick={() => setAddCardDialogOpen(true)}
              >
                <div>
                  <Plus />
                  <span>{i18nText[language].addCard}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* add folder */}
            <SidebarMenuItem className="cursor-pointer">
              <SidebarMenuButton
                asChild
                onClick={() => setAddFolderDialogOpen(true)}
              >
                <div>
                  <FolderPlus />
                  <span>{i18nText[language].addFolder}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <AddCardDialog open={addCardDialogOpen} setOpen={setAddCardDialogOpen} />
      <AddFolderDialog
        open={addFolderDialogOpen}
        setOpen={setAddFolderDialogOpen}
      />
    </>
  );
}

interface AddCardDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

function AddCardDialog({ open, setOpen }: AddCardDialogProps) {
  const { language } = useUserContextV2();
  const { currentFolderId } = useAppState();
  const [isComposing, setIsComposing] = useState(false);
  const [cardName, setCardName] = useState("");

  const createCardMutation = useCreateCard();

  const addCard = () => {
    return createCardMutation.mutateAsync({
      folderId: currentFolderId,
      title: cardName,
      payload: {},
    });
  };

  useEffect(() => {
    if (open) {
      setCardName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].addCard}</DialogTitle>
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
                addCard().then(() => setOpen(false));
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
                addCard().then(() => setOpen(false));
              }}
              disabled={!cardName.trim() || createCardMutation.isPending}
            >
              {i18nText[language].add}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddFolderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

function AddFolderDialog({ open, setOpen }: AddFolderDialogProps) {
  const { language } = useUserContextV2();
  const { currentFolderId } = useAppState();
  const [isComposing, setIsComposing] = useState(false);
  const [folderName, setFolderName] = useState("");

  const createFolderMutation = useCreateFolder();

  const addFolder = () => {
    return createFolderMutation.mutateAsync({
      parentId: currentFolderId,
      title: folderName,
      payload: {},
    });
  };

  useEffect(() => {
    if (open) {
      setFolderName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{i18nText[language].addFolder}</DialogTitle>
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
                addFolder().then(() => setOpen(false));
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
                addFolder().then(() => setOpen(false));
              }}
              disabled={!folderName.trim() || createFolderMutation.isPending}
            >
              {i18nText[language].add}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    addCard: "添加卡片",
    addFolder: "添加文件夹",
    cancel: "取消",
    add: "添加",
    cardNamePlaceholder: "输入卡片标题",
    folderNamePlaceholder: "输入文件夹标题",
    exitArchiveMode: "退出归档模式",
  },
  [UserLangEnum.ENUS]: {
    addCard: "Add Card",
    addFolder: "Add Folder",
    cancel: "Cancel",
    add: "Add",
    cardNamePlaceholder: "Enter card name...",
    folderNamePlaceholder: "Enter folder name...",
    exitArchiveMode: "Exit Archive Mode",
  },
};
