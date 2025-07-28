"use client";
import TodoList from "@/components/todo-list";
import {
  useCollections,
  useCreateCollection,
  type Collection,
} from "@/hooks/use-todos";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { ChevronDown, FolderPlus, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Todo() {
  const isMobile = useIsMobile();
  const { data } = useCollections();
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const inbox = {
    id: 0,
    name: "📥 Inbox",
  };
  const [collections, setCollections] = useState<Collection[]>([inbox]);
  const [newListName, setNewListName] = useState("");
  const [newListDialogOpen, setNewListDialogOpen] = useState(false);
  const createCollectionMutation = useCreateCollection();
  const [activeListId, setActiveListId] = useState<number>(0);

  const createNewList = async () => {
    if (newListName.trim() !== "") {
      await createCollectionMutation.mutateAsync({
        name: newListName,
      });
      setNewListDialogOpen(false);
      setNewListName("");
    }
  };

  useEffect(() => {
    if (data) {
      setCollections([inbox, ...data]);
    }
  }, [data]);

  return (
    <div className="space-y-6 p-6">
      {/* Mobile Layout - Dropdown */}
      <div className={`w-full ${isMobile ? "block" : "hidden"}`}>
        <TodoList collectionId={activeListId}>
          <DropdownMenu onOpenChange={(open) => setListDropdownOpen(open)}>
            <DropdownMenuTrigger asChild>
              <div className="flex h-auto items-center p-0 text-xl font-bold hover:bg-transparent">
                {collections[
                  collections.findIndex(
                    (collection) => collection.id === activeListId,
                  )
                ]?.name || collections[0].name}
                <ChevronDown
                  className={`ml-1 h-4 w-4 transition-transform duration-200 ${listDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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
              <DropdownMenuItem onClick={() => setNewListDialogOpen(true)}>
                <FolderPlus className="h-4 w-4" />
                Create New List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TodoList>
      </div>

      {/* Desktop Layout - Grid */}
      <div className={`mx-auto max-w-7xl ${isMobile ? "hidden" : "block"}`}>
        <div className="grid grid-cols-1 gap-x-1 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <TodoList key={collection.id} collectionId={collection.id} />
          ))}

          {/* Add New List Card */}
          <Card className="hover:border-primary/50 mx-auto h-fit w-full max-w-sm border-2 border-dashed transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <FolderPlus className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 font-semibold">Create New List</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Add another todo list to organize your tasks
              </p>
              <Button
                onClick={() => setNewListDialogOpen(true)}
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                New List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create New List Dialog */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">Create New List</DialogTitle>
            <DialogDescription className="text-left">
              Ready to organize your tasks?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter list name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
                Cancel
              </Button>
              <Button
                onClick={createNewList}
                disabled={
                  !newListName.trim() || createCollectionMutation.isPending
                }
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
