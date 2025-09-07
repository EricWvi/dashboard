"use client";
import TodoList from "@/components/todo/todo-list";
import { useCollections, useCreateCollection } from "@/hooks/use-todos";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, FolderPlus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

export default function Todo() {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const [isComposing, setIsComposing] = useState(false);
  const { data: collections } = useCollections();

  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [activeListId, setActiveListId] = useState<number>(0);

  const [newListName, setNewListName] = useState("");
  const [newListDialogOpen, setNewListDialogOpen] = useState(false);
  const createCollectionMutation = useCreateCollection();

  const createNewList = async () => {
    if (newListName.trim() !== "") {
      await createCollectionMutation.mutateAsync({
        name: newListName,
      });
      setNewListDialogOpen(false);
      setNewListName("");
    }
  };

  if (!collections) return null;

  const mobileView = (
    <div className="size-full">
      <TodoList
        collectionId={activeListId}
        headerContent={
          <DropdownMenu onOpenChange={(open) => setListDropdownOpen(open)}>
            <DropdownMenuTrigger asChild>
              <div className="flex h-auto cursor-pointer items-center p-0 text-2xl font-bold">
                {collections.find(
                  (collection) => collection.id === activeListId,
                )?.name || collections[0].name}
                <ChevronDown
                  className={`ml-1 size-5 transition-transform ${listDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-30">
              {collections.map((collection) => (
                <DropdownMenuItem
                  key={collection.id}
                  onClick={() => setActiveListId(collection.id)}
                  className={activeListId === collection.id ? "bg-accent" : ""}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{collection.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setNewListDialogOpen(true)}
                className="gap-1"
              >
                <FolderPlus />
                {i18nText[language].newList}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  );

  const desktopView = (
    <div className="fixed top-16 bottom-16 w-full">
      <div className="flex h-full">
        <div className="xl:flex-1/8"></div>
        <div className="flex h-full min-w-0 flex-1/1">
          {/* Space Block */}
          <div className="flex-1/20"></div>

          {/* Sidebar - List Navigation */}
          <div className="mt-16 flex-0">
            <div className="h-full">
              <div className="p-4">
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <Button
                      key={collection.id}
                      variant="ghost"
                      className={`w-full justify-center ${
                        activeListId === collection.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setActiveListId(collection.id)}
                    >
                      {collection.name}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="hover:border-primary/50 text-muted-foreground gap-1 border-2 border-dashed transition-colors hover:bg-none"
                    onClick={() => setNewListDialogOpen(true)}
                  >
                    <FolderPlus />
                    {i18nText[language].newList}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Space Block */}
          <div className="flex-1/20"></div>

          {/* Main Content - Todo List */}
          <div className="min-w-0 flex-1/1">
            <TodoList collectionId={activeListId} />
          </div>
        </div>
        <div className="flex-1/25"></div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? mobileView : desktopView}

      {/* Create New List Dialog */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">
              {i18nText[language].createNewList}
            </DialogTitle>
            <DialogDescription className="text-left">
              {i18nText[language].createNewListDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={i18nText[language].enterListName}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  createNewList();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setNewListDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={createNewList}
                disabled={
                  !newListName.trim() || createCollectionMutation.isPending
                }
              >
                {i18nText[language].create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    newList: "创建集合",
    createNewList: "创建新集合",
    createNewListDesc: "准备好组织你的任务了吗？",
    enterListName: "输入集合名称...",
    cancel: "取消",
    create: "创建",
  },
  [UserLangEnum.ENUS]: {
    newList: "New List",
    createNewList: "Create New List",
    createNewListDesc: "Ready to organize your tasks?",
    enterListName: "Enter list name...",
    cancel: "Cancel",
    create: "Create",
  },
};
