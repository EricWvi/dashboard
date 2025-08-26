import { useEffect, useState } from "react";
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
import {
  invalidToday,
  listAllTodos,
  useCollection,
  useCollections,
  useCompleted,
  useCreateTodo,
  useDeleteCollection,
  usePlanToday,
  useToday,
  useTodos,
  useUpdateCollection,
  type Todo,
} from "@/hooks/use-todos";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CompletedTodoView,
  PlanTodoView,
  TodayTodoView,
  TodoEntry,
} from "@/components/todo/todo-entry";
import { isDisabledPlan, isSetToday } from "@/lib/utils";
import { usePageVisibility } from "@/hooks/use-page-visibility";

const TodoList = ({
  collectionId,
  headerContent,
}: {
  collectionId: number;
} & { headerContent?: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { data: todos } = useTodos(collectionId);
  const { data: collection } = useCollection(collectionId);
  const [isComposing, setIsComposing] = useState(false);

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
      <div className="min-h-0 min-w-0 flex-1/1">
        <Card
          className={`h-full max-w-4xl gap-4 ${isMobile ? "border-none bg-transparent pt-6 pb-0 shadow-none" : ""}`}
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

              {/* to do list top right menu */}
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

          <CardContent className="flex min-h-0 flex-1 flex-col">
            {/* Add new task */}
            <div className="flex gap-2 space-y-6">
              <Input
                placeholder="Add a new task..."
                value={newTodo}
                disabled={createTodoMutation.isPending}
                onChange={(e) => setNewTodo(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
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

            {/* Task list */}
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-scroll ${!isMobile ? "rounded-sm" : ""}`}
            >
              {todos &&
                (todos.length === 0 ? (
                  <div className="text-muted-foreground flex min-h-0 w-full flex-1 flex-col text-lg">
                    <div className="flex min-h-0 flex-1 items-center justify-center">
                      All Done!
                    </div>
                    <div className="min-h-0 flex-1"></div>
                  </div>
                ) : (
                  <div className="min-h-0 w-full flex-1">
                    <div className="pb-6">
                      {
                        <div className="space-y-2">
                          {todos.map((todo: number, idx: number) => (
                            <TodoEntry
                              key={todo}
                              id={todo}
                              top={idx === 0}
                              collectionId={collectionId}
                            />
                          ))}
                        </div>
                      }

                      {/* display Completed Tasks List in TodoList when isMobile */}
                      {collectionId !== 0 && isMobile && completedTodoOpen && (
                        <CompletedList collectionId={collectionId} />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>

          {/* Edit List Dialog */}
          <Dialog
            open={editListDialogOpen}
            onOpenChange={setEditListDialogOpen}
          >
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
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isComposing) {
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
                <AlertDialogDescription className="wrap-anywhere">
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
      </div>

      {!isMobile && completedTodoOpen && (
        <div className="min-h-0 min-w-0 flex-1/2">
          <CompletedList collectionId={collectionId} />
        </div>
      )}
    </div>
  );
};

const CompletedList = ({ collectionId }: { collectionId: number }) => {
  const isMobile = useIsMobile();
  const { data: completed } = useCompleted(collectionId);

  return (
    <Card
      className={`max-w-4xl gap-4 ${isMobile ? "border-none bg-transparent shadow-none" : "h-full"}`}
    >
      <CardHeader className={`${isMobile ? "px-0" : ""}`}>
        <CardTitle>
          <div className="flex items-end justify-between">
            <div className="text-muted-foreground h-8 text-xl">Completed</div>
            {completed && (
              <div className="flex items-center gap-2">
                {completed.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground h-fit"
                  >
                    Clear {completed.length} todos
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent
        className={`flex min-h-0 flex-1 flex-col overflow-scroll ${isMobile ? "px-0" : "rounded-sm"}`}
      >
        {completed &&
          (completed.length > 0 ? (
            <div className="min-h-0 w-full flex-1">
              <div className="space-y-2">
                {completed.map((todo: number) => (
                  <CompletedTodoView
                    key={todo}
                    id={todo}
                    collectionId={collectionId}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground flex min-h-0 w-full flex-1 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                No Completed Tasks...
              </div>
              <div className="min-h-0 flex-1"></div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export const TodayTodoList = () => {
  const isMobile = useIsMobile();
  const { data: today, isLoading } = useToday();
  const [loadingFlag, setLoadingFlag] = useState(false); // loading animation for second day's refetch
  const [todayDate, setTodayDate] = useState(new Date().toDateString());
  usePageVisibility(() => {
    if (new Date().toDateString() !== todayDate) {
      setTodayDate(new Date().toDateString());
      setLoadingFlag(true);
      setTimeout(() => {
        setLoadingFlag(false);
      }, 300);
      invalidToday();
    }
  });

  const { data: collections } = useCollections();
  const [collectionMap, setCollectionMap] = useState<Record<string, string>>(
    {},
  );
  // plan today dialog
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [planTodayDialogOpen, setPlanTodayDialogOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const planTodayMutation = usePlanToday();

  const planSelectedIds = async () => {
    const selectedIds = Array.from(checkedIds);
    if (selectedIds.length !== 0) {
      await planTodayMutation.mutateAsync({
        ids: selectedIds,
      });
    }
    planTodayClose();
  };

  const planTodayOpen = async () => {
    setPlanTodayDialogOpen(true);
    setAllTodos(await listAllTodos());
    setCheckedIds(new Set());
  };

  const planTodayClose = () => {
    setPlanTodayDialogOpen(false);
    setAllTodos([]);
    setCheckedIds(new Set());
  };

  useEffect(() => {
    if (collections) {
      const map: Record<string, string> = {};
      collections.forEach((collection) => {
        map[collection.id] = collection.name;
      });
      setCollectionMap(map);
    }
  }, [collections]);

  return (
    <Card className="max-w-4xl gap-1">
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between">
            <div className="text-xl">Today</div>
            <Button
              variant={"ghost"}
              size="icon"
              className="h-8 w-8 transition-transform hover:rotate-90"
              onClick={planTodayOpen}
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* desktop fixed height, mobile full height */}
        <div
          className={`flex flex-col rounded-sm ${isMobile ? "min-h-20" : "h-120 overflow-scroll"}`}
        >
          {/* 1. UI library components have complex nested DOM structures that make `h-full` problematic. */}
          {/* 2. min-h-0 lets flex items shrink as needed, fixing overflow and scrolling issues in flex layouts. */}
          {loadingFlag || isLoading ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
              </div>
            </>
          ) : (
            today &&
            (today.length === 0 ? (
              <div className="text-muted-foreground flex min-h-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  No Scheduled Tasks...
                </div>
                <div className="min-h-0 flex-1"></div>
              </div>
            ) : (
              <div className="min-h-0 w-full flex-1">
                {Object.entries(
                  today
                    .sort((a, b) => b.order - a.order)
                    .reduce(
                      (acc, item) => {
                        (acc[item.collectionId] =
                          acc[item.collectionId] || []).push(item);
                        return acc;
                      },
                      {} as Record<number, Todo[]>,
                    ),
                ).map(([key, items]) => (
                  <div key={key}>
                    {/* 3. Apply `rounded-sm` + `overflow-hidden`, the browser creates a clipping context 
                          to ensure content stays within the rounded corners. This clipping can 
                          trigger several rendering behaviors that affect how emojis are displayed.
                          use `transform-gpu` (`transform: translateZ(0)`) to create a new layer */}
                    <div className="text-muted-foreground mb-1 transform-gpu text-sm font-medium">
                      {collectionMap[key]}
                    </div>
                    <div className="mb-3 space-y-2">
                      {items.map((todo) => (
                        <TodayTodoView key={todo.id} id={todo.id} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Plan Today Dialog */}
      <Dialog
        open={planTodayDialogOpen}
        onOpenChange={(open: boolean) => {
          if (open) {
            planTodayOpen();
          } else {
            planTodayClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex items-start justify-between">
            <DialogHeader className="text-left">
              <DialogTitle>My Day</DialogTitle>
              <DialogDescription>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>
            <Button className="px-6" onClick={planSelectedIds}>
              Plan
            </Button>
          </div>
          <div className="h-140 space-y-6 overflow-scroll sm:h-180">
            {Object.entries(
              allTodos
                .filter((todo) => !isDisabledPlan(todo.schedule))
                .sort((a, b) => b.count - a.count)
                .reduce(
                  (acc, item) => {
                    (acc[item.collectionId] =
                      acc[item.collectionId] || []).push(item);
                    return acc;
                  },
                  {} as Record<number, Todo[]>,
                ),
            ).map(([key, items]) => (
              <div key={key}>
                {/* 3. Apply `rounded-sm` + `overflow-hidden`, the browser creates a clipping context 
                          to ensure content stays within the rounded corners. This clipping can 
                          trigger several rendering behaviors that affect how emojis are displayed.
                          use `transform-gpu` (`transform: translateZ(0)`) to create a new layer */}
                <div className="text-muted-foreground mb-1 transform-gpu text-base font-medium">
                  {collectionMap[key]}
                </div>
                <div className="mb-3 space-y-3">
                  {items.map((todo) => (
                    <PlanTodoView
                      key={todo.id}
                      todo={todo}
                      disabled={isSetToday(todo.schedule)}
                      handleCheck={(id: number, checked: boolean) => {
                        setCheckedIds((prev) => {
                          const newSet = new Set(prev);
                          if (checked) {
                            newSet.add(id);
                          } else {
                            newSet.delete(id);
                          }
                          return newSet;
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TodoList;
