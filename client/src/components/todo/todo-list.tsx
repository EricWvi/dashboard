import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MoreHorizontal, Edit, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCollection,
  useCompleted,
  useCreateTodo,
  useDeleteCollection,
  useToday,
  useTodos,
  useUpdateCollection,
} from "@/hooks/use-todos";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CompletedTodoView,
  TodayTodoView,
  TodoEntry,
} from "@/components/todo/todo-entry";

const TodoList = ({
  collectionId,
  headerContent,
}: {
  collectionId: number;
} & { headerContent?: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { data: todos } = useTodos(collectionId);
  const { data: collection } = useCollection(collectionId);

  const createTodoMutation = useCreateTodo();
  const deleteCollectionMutation = useDeleteCollection();
  const updateCollectionMutation = useUpdateCollection();

  const [newTodo, setNewTodo] = useState("");
  const [editListDialogOpen, setEditListDialogOpen] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  const [completedTodoOpen, setCompletedTodoOpen] = useState(false);

  const addTodo = async () => {
    if (newTodo.trim() !== "") {
      await createTodoMutation.mutateAsync({ title: newTodo, collectionId });
      setNewTodo("");
    }
  };

  const onRename = async () => {
    if (editListName.trim() !== "") {
      await updateCollectionMutation.mutateAsync({
        id: collectionId,
        name: editListName,
      });
    }
  };

  const onDelete = async () => {
    await deleteCollectionMutation.mutateAsync(collectionId);
  };

  return (
    <div className={`mx-auto flex h-full w-full flex-col gap-6 xl:flex-row`}>
      <Card
        className={`h-full min-h-0 max-w-4xl flex-1/1 gap-4 ${isMobile && "border-none bg-transparent pt-6 pb-0 shadow-none"}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {headerContent ? (
                headerContent
              ) : collection ? (
                <div className="h-8 text-2xl">{collection.name}</div>
              ) : (
                <Skeleton className="h-8 w-32 rounded-md" />
              )}
            </CardTitle>
            {collectionId !== 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditListName(collection?.name ?? "");
                      setEditListDialogOpen(true);
                    }}
                  >
                    <Edit />
                    Rename List
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCompletedTodoOpen((prev) => !prev)}
                  >
                    <CheckCheck />
                    {completedTodoOpen ? "Hide" : "Show"} Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteListDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="text-destructive" />
                    Delete List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        {/* min-h-0 lets flex items shrink as needed, fixing overflow and scrolling issues in flex layouts. */}
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {/* Add new task */}
          <div className="flex gap-2 space-y-6">
            <Input
              placeholder="Add a new task..."
              value={newTodo}
              disabled={createTodoMutation.isPending}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addTodo();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={addTodo}
              disabled={!newTodo.trim() || createTodoMutation.isPending}
              size="icon"
            >
              <Plus />
            </Button>
          </div>

          {/* Task statistics */}
          {/* {totalCount > 0 && (
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <div className="flex gap-4">
                <span>Total: {totalCount}</span>
                <span>Completed: {completedCount}</span>
                <span>Remaining: {totalCount - completedCount}</span>
              </div>
              {completedCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              )}
            </div>
          )} */}

          {/* Task list */}
          <div className="min-h-0 flex-1">
            <ScrollArea className="h-full w-full rounded-sm">
              <div className="mb-6">
                {todos && (
                  <div className="space-y-2">
                    {todos.length === 0 ? (
                      <div className="text-muted-foreground py-32 text-center text-lg">
                        All Done!
                      </div>
                    ) : (
                      todos.map((todo: number) => (
                        <TodoEntry
                          key={todo}
                          id={todo}
                          collectionId={collectionId}
                        />
                      ))
                    )}
                  </div>
                )}
                {isMobile && completedTodoOpen && (
                  <CompletedList collectionId={collectionId} />
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        {/* Edit List Dialog */}
        <Dialog open={editListDialogOpen} onOpenChange={setEditListDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Todo List</DialogTitle>
              <DialogDescription>
                Enter a new name for your todo list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter new name..."
                value={editListName}
                disabled={updateCollectionMutation.isPending}
                onChange={(e) => setEditListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename();
                    setEditListDialogOpen(false);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditListDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onRename();
                    setEditListDialogOpen(false);
                  }}
                  disabled={
                    !editListName.trim() || updateCollectionMutation.isPending
                  }
                >
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete List Confirmation Dialog */}
        <AlertDialog
          open={deleteListDialogOpen}
          onOpenChange={setDeleteListDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Todo List</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete [{collection?.name}]? <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete();
                  setDeleteListDialogOpen(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
      {!isMobile && completedTodoOpen && (
        <CompletedList collectionId={collectionId} />
      )}
    </div>
  );
};

const CompletedList = ({ collectionId }: { collectionId: number }) => {
  const isMobile = useIsMobile();
  const { data: completed } = useCompleted(collectionId);

  return (
    <Card
      className={`h-full min-h-0 max-w-4xl flex-1/2 gap-4 ${isMobile && "border-none bg-transparent shadow-none"}`}
    >
      <CardHeader className={`${isMobile && "px-0"}`}>
        <CardTitle>
          <div className="text-muted-foreground h-8 text-xl">Completed</div>
        </CardTitle>
      </CardHeader>

      <CardContent
        className={`flex min-h-0 flex-1 flex-col ${isMobile && "px-0"}`}
      >
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full rounded-sm">
            {completed && (
              <div className="space-y-2">
                {completed.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No Completed Tasks...
                  </div>
                ) : (
                  completed.map((todo: number) => (
                    <CompletedTodoView
                      key={todo}
                      id={todo}
                      collectionId={collectionId}
                    />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export const TodayTodoList = () => {
  const isMobile = useIsMobile();
  const { data: today } = useToday();

  return (
    <Card
      className={`h-full min-h-0 max-w-4xl flex-1/2 gap-4 ${isMobile && "border-none bg-transparent shadow-none"}`}
    >
      <CardHeader>
        <CardTitle>
          <div className="text-muted-foreground h-8 text-xl">Today</div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full rounded-sm">
            {today && (
              <div className="space-y-2">
                {today.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No Completed Tasks...
                  </div>
                ) : (
                  today.map((todo: number) => (
                    <TodayTodoView key={todo} id={todo} />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodoList;
