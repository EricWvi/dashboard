import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  MoreVertical,
  Edit,
  Link,
  ListEnd,
  NotepadText,
  CircleCheckBig,
  Calendar as CalendarIcon,
  X,
  CheckCheck,
  CalendarDays,
} from "lucide-react";
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  type Todo,
  useCollection,
  useCollections,
  useCreateTodo,
  useDeleteCollection,
  useDeleteTodo,
  useMoveTodo,
  useTodo,
  useTodos,
  useUpdateCollection,
  useUpdateTodo,
} from "@/hooks/use-todos";
import { formatDate, isSetDate, isSetToday, todayStart } from "@/lib/utils";
import { useTTContext } from "@/components/editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCreateTiptap } from "@/hooks/use-draft";

const TodoView = ({ id }: { id: number }) => {
  const { data: todo, isLoading } = useTodo(id);
  return (
    !isLoading &&
    todo && (
      <Card
        className={`group relative rounded-sm py-2 transition-all ${todo.completed ? "opacity-75" : ""}`}
      >
        {/* <Checkbox
            id={`task-${todo.id}`}
            checked={todo.completed}
            onCheckedChange={() => toggleTask(todo.id)}
          /> */}
        {todo.completed && (
          <Badge variant="secondary" className="text-xs">
            Done
          </Badge>
        )}
      </Card>
    )
  );
};

const Todo = ({ id, collectionId }: { id: number; collectionId: number }) => {
  const { data: collections } = useCollections();
  const { data: todo, isLoading } = useTodo(id);
  // to-do state
  const [editTodoDialogOpen, setEditTodoDialogOpen] = useState(false);
  const [editTodoName, setEditTodoName] = useState("");
  const deleteTodoMutation = useDeleteTodo(collectionId);
  const updateTodoMutation = useUpdateTodo();
  const moveTodoMutation = useMoveTodo();
  const deleteTodo = async () => {
    await deleteTodoMutation.mutateAsync(id);
  };
  const completeTodo = async () => {
    await updateTodoMutation.mutateAsync({ id, completed: true });
  };
  const renameTodo = async () => {
    await updateTodoMutation.mutateAsync({ id, title: editTodoName });
  };
  const moveTodo = async (dst: number) => {
    await moveTodoMutation.mutateAsync({ id, src: collectionId, dst });
  };
  // difficulty state
  const [difficultyLabel, setDifficultyLabel] = useState(0);
  const updateDifficulty = async (difficulty: number) => {
    await updateTodoMutation.mutateAsync({ id, difficulty });
  };
  // link state
  const [editLinkDialogOpen, setEditLinkDialogOpen] = useState(false);
  const [editLinkName, setEditLinkName] = useState("");
  const changeLink = async (link: string) => {
    if (link.trim() === "") {
      link = "unset"; // Handle empty link case
    }
    await updateTodoMutation.mutateAsync({ id, link });
  };
  // date state
  const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined | null>(
    undefined,
  );
  const updateScheduleDate = async (date: Date | undefined | null) => {
    if (date === undefined) {
      return;
    }
    await updateTodoMutation.mutateAsync({ id, schedule: date });
  };
  const unsetScheduleDate = async () => {
    await updateTodoMutation.mutateAsync({ id, schedule: new Date(0) });
  };
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const updateTodoDraft = async (draftId: number) => {
    await updateTodoMutation.mutateAsync({ id, draft: draftId });
  };

  return (
    !isLoading &&
    todo && (
      <Card
        key={todo.id}
        className={`group relative rounded-sm py-2 transition-all ${todo.completed ? "opacity-75" : ""}`}
      >
        {/* Difficulty indicator - left border stripe */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${
            todo.difficulty === 1
              ? "bg-green-400 dark:bg-green-600"
              : todo.difficulty === 2
                ? "bg-yellow-400 dark:bg-yellow-600"
                : todo.difficulty === 3
                  ? "bg-orange-400 dark:bg-orange-600"
                  : "bg-red-400 dark:bg-red-600"
          }`}
        />
        <ContextMenu>
          <ContextMenuTrigger>
            <CardContent className="group flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm">
                {todo.link === "" ? (
                  <div className="line-clamp-1" title={todo.title}>
                    {todo.title}
                  </div>
                ) : (
                  <a
                    className="line-clamp-1 font-semibold underline decoration-dashed"
                    title={todo.title}
                    href={todo.link}
                    target="_blank"
                  >
                    {todo.title}
                  </a>
                )}

                {/* Difficulty dots indicator */}
                <div className="mt-1 flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onMouseEnter={() => setDifficultyLabel(level)}
                        onMouseLeave={() => setDifficultyLabel(0)}
                        onClick={() => updateDifficulty(level)}
                        className={`h-2 w-2 cursor-pointer rounded-full transition-all hover:scale-125 ${
                          level <= todo.difficulty
                            ? todo.difficulty === 1
                              ? "bg-green-400 dark:bg-green-600"
                              : todo.difficulty === 2
                                ? "bg-yellow-400 dark:bg-yellow-600"
                                : todo.difficulty === 3
                                  ? "bg-orange-400 dark:bg-orange-600"
                                  : "bg-red-400 dark:bg-red-600"
                            : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-muted-foreground ml-1 text-xs opacity-0 ${difficultyLabel !== 0 ? "opacity-100" : ""}`}
                  >
                    {difficultyLabel === 1
                      ? "Easy"
                      : difficultyLabel === 2
                        ? "Medium"
                        : difficultyLabel === 3
                          ? "Hard"
                          : "Very Hard"}
                  </span>
                </div>
              </div>

              {/* Schedule date badge */}
              <Badge
                variant="outline"
                onClick={() => {
                  if (todo.schedule && isSetToday(todo.schedule)) {
                    unsetScheduleDate();
                  } else if (!isSetDate(todo.schedule)) {
                    updateScheduleDate(todayStart());
                  }
                }}
                className={`cursor-pointer border-blue-200 bg-blue-50 text-xs text-blue-700 transition-transform hover:scale-110 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 ${todo.schedule && isSetDate(todo.schedule) ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}
              >
                {todo.schedule && isSetDate(todo.schedule)
                  ? formatDate(todo.schedule)
                  : "Today"}
              </Badge>
            </CardContent>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {todo.schedule && isSetDate(todo.schedule) ? (
              <>
                <ContextMenuItem
                  onClick={() => {
                    setScheduleDate(todo.schedule);
                    setEditDateDialogOpen(true);
                  }}
                >
                  <CalendarDays className="h-4 w-4" />
                  Reset Date
                </ContextMenuItem>
                <ContextMenuItem onClick={unsetScheduleDate}>
                  <X className="h-4 w-4" />
                  Unset Date
                </ContextMenuItem>
              </>
            ) : (
              <ContextMenuItem
                onClick={() => {
                  setScheduleDate(todo.schedule);
                  setEditDateDialogOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
                Set Date
              </ContextMenuItem>
            )}
            {collectionId !== 0 && (
              <ContextMenuItem onClick={completeTodo}>
                <CircleCheckBig className="h-4 w-4" />
                Done
              </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                setEditTodoName(todo.title);
                setEditTodoDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                setEditLinkName(todo.link);
                setEditLinkDialogOpen(true);
              }}
            >
              <Link className="h-4 w-4" />
              Link
            </ContextMenuItem>
            <ContextMenuItem
              onClick={async () => {
                if (todo.draft !== 0) {
                  setEditorId(todo.draft);
                  setEditorDialogOpen(true);
                } else {
                  const draftId = await useCreateTiptap();
                  setEditorId(draftId);
                  setEditorDialogOpen(true);
                  updateTodoDraft(draftId);
                }
              }}
            >
              <NotepadText className="h-4 w-4" />
              Draft
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <div className="flex items-center gap-2">
                  <ListEnd className="text-muted-foreground h-4 w-4" />
                  Move To
                </div>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {collections
                  ?.filter((c) => c.id !== collectionId)
                  .map((collection) => (
                    <ContextMenuItem
                      key={collection.id}
                      onClick={() => moveTodo(collection.id)}
                    >
                      {collection.name}
                    </ContextMenuItem>
                  ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={deleteTodo}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="text-destructive h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Edit todo Dialog */}
        <Dialog open={editTodoDialogOpen} onOpenChange={setEditTodoDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Todo</DialogTitle>
              <DialogDescription>
                Enter a new name for your todo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter new name..."
                value={editTodoName}
                disabled={updateTodoMutation.isPending}
                onChange={(e) => setEditTodoName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameTodo();
                    setEditTodoDialogOpen(false);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditTodoDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    renameTodo();
                    setEditTodoDialogOpen(false);
                  }}
                  disabled={
                    !editTodoName.trim() || updateTodoMutation.isPending
                  }
                >
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit link Dialog */}
        <Dialog open={editLinkDialogOpen} onOpenChange={setEditLinkDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Link</DialogTitle>
              <DialogDescription>Set a link to redirect.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter new link..."
                value={editLinkName}
                disabled={updateTodoMutation.isPending}
                onChange={(e) => setEditLinkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    changeLink(editLinkName);
                    setEditLinkDialogOpen(false);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditLinkDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    changeLink(editLinkName);
                    setEditLinkDialogOpen(false);
                  }}
                  disabled={updateTodoMutation.isPending}
                >
                  Set
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit date Dialog */}
        <Dialog open={editDateDialogOpen} onOpenChange={setEditDateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Date</DialogTitle>
              <DialogDescription>
                Set a date for the todo item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-fit justify-normal font-normal"
                    >
                      {scheduleDate && isSetDate(scheduleDate) ? (
                        <>
                          <CalendarDays className="text-muted-foreground h-4 w-4" />
                          {new Date(scheduleDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="text-muted-foreground h-4 w-4" />
                          Select date
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      disabled={(date) => date < todayStart()}
                      selected={
                        scheduleDate && isSetDate(scheduleDate)
                          ? scheduleDate
                          : undefined
                      }
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setScheduleDate(date);
                        setOpenCalendar(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateScheduleDate(scheduleDate);
                    setEditDateDialogOpen(false);
                  }}
                  disabled={updateTodoMutation.isPending}
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    )
  );
};

const TodoList = ({
  collectionId,
  children,
}: {
  collectionId: number;
} & { children?: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { data: todos, isLoading } = useTodos(collectionId);
  const { data: collection, isLoading: isCloading } =
    useCollection(collectionId);
  const createTodoMutation = useCreateTodo();
  const deleteCollectionMutation = useDeleteCollection();
  const updateCollectionMutation = useUpdateCollection();
  const [newTodo, setNewTodo] = useState("");

  const [editListDialogOpen, setEditListDialogOpen] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);

  const addTodo = async () => {
    if (newTodo.trim() !== "") {
      await createTodoMutation.mutateAsync({
        title: newTodo,
        completed: false,
        collectionId,
        difficulty: 1, // Default difficulty
        link: "", // Default empty link
        draft: 0, // Default null draft
        schedule: undefined, // Default to null date
      });
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
    <>
      {!isLoading && !isCloading && todos && collection && (
        <div className="mx-auto w-full max-w-sm">
          <Card className="gap-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{children ? children : collection.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${collectionId !== 0 ? "" : "pointer-events-none opacity-0"}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditListName(collection.name);
                        setEditListDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Rename List
                    </DropdownMenuItem>
                    {/* className={`${
                   todo.completed
                     ? "text-muted-foreground line-through"
                     : "text-foreground"
                 }`} */}
                    <DropdownMenuItem
                    // onClick={() => setDeleteListDialogOpen(true)}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Show Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteListDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                      Delete List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add new task */}
              <div className="flex gap-2 space-y-4">
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
                  <Plus className="h-4 w-4" />
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
              <div
                className={`space-y-2 overflow-y-auto ${isMobile ? "h-128" : "h-72"}`}
              >
                {todos.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    All Done!
                  </div>
                ) : (
                  todos.map((todo: number) => (
                    <Todo key={todo} id={todo} collectionId={collectionId} />
                  ))
                )}
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
                        !editListName.trim() ||
                        updateCollectionMutation.isPending
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
                    Are you sure you want to delete [{collection.name}]? <br />
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
      )}
    </>
  );
};

export default TodoList;
