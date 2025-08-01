import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Edit,
  Link,
  ListEnd,
  NotepadText,
  CircleCheckBig,
  Calendar as CalendarIcon,
  X,
  CalendarDays,
  ArchiveRestore,
  Archive,
  Undo2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  useCollections,
  useCompleteTodo,
  useDeleteTodo,
  useDoneTodo,
  useMoveTodo,
  useRestoreTodo,
  useTodo,
  useUndoneTodo,
  useUnsetLink,
  useUpdateSchedule,
  useUpdateTodo,
} from "@/hooks/use-todos";
import {
  stripeColor,
  formatDate,
  isSetDate,
  isSetToday,
  todayStart,
  dotColor,
} from "@/lib/utils";
import { useTTContext } from "@/components/editor";
import { createTiptap } from "@/hooks/use-draft";

export const TodayTodoView = ({ id }: { id: number }) => {
  const [isComposing, setIsComposing] = useState(false);
  const { data: todo } = useTodo(id);

  // to-do state
  const [editTodoDialogOpen, setEditTodoDialogOpen] = useState(false);
  const [editTodoName, setEditTodoName] = useState("");
  const updateTodoMutation = useUpdateTodo();
  const undoneTodoMutation = useUndoneTodo();
  const doneTodoMutation = useDoneTodo();
  const unsetLinkMutation = useUnsetLink();
  const renameTodo = async () => {
    await updateTodoMutation.mutateAsync({ id, title: editTodoName });
  };
  const doneTodo = async () => {
    await doneTodoMutation.mutateAsync({ id });
  };
  const undoneTodo = async () => {
    await undoneTodoMutation.mutateAsync({ id });
  };

  // link state
  const [editLinkDialogOpen, setEditLinkDialogOpen] = useState(false);
  const [editLinkName, setEditLinkName] = useState("");
  const changeLink = async (link: string) => {
    if (link.trim() === "") {
      await unsetLinkMutation.mutateAsync({ id });
    } else {
      await updateTodoMutation.mutateAsync({ id, link });
    }
  };
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const updateTodoDraft = async (draftId: number) => {
    await updateTodoMutation.mutateAsync({ id, draft: draftId });
  };

  const TodayTodoMenuContent = () =>
    todo && (
      <ContextMenuContent>
        {todo.done ? (
          <ContextMenuItem onClick={undoneTodo}>
            <Undo2 />
            Undone
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onClick={doneTodo}>
            <CircleCheckBig />
            Done
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onClick={() => {
            setEditTodoName(todo.title);
            setEditTodoDialogOpen(true);
          }}
        >
          <Edit />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setEditLinkName(todo.link);
            setEditLinkDialogOpen(true);
          }}
        >
          <Link />
          Link
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            if (todo.draft !== 0) {
              setEditorId(todo.draft);
              setEditorDialogOpen(true);
            } else {
              const draftId = await createTiptap();
              setEditorId(draftId);
              setEditorDialogOpen(true);
              updateTodoDraft(draftId);
            }
          }}
        >
          <NotepadText />
          Draft
        </ContextMenuItem>
      </ContextMenuContent>
    );

  return (
    todo && (
      <>
        <Card
          className={`group relative rounded-sm py-2 transition-all select-none xl:select-auto ${todo.done && "opacity-75"}`}
        >
          {/* Difficulty indicator - left border stripe */}
          <div
            className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
          />
          <ContextMenu>
            <ContextMenuTrigger>
              <CardContent className="group flex items-center gap-3 pr-2">
                <div
                  className={`min-w-0 flex-1 text-sm ${todo.done && "text-muted-foreground line-through"}`}
                >
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
                </div>

                <span className="flex items-center gap-1">
                  {todo.draft !== 0 && (
                    <Button
                      variant="ghost"
                      className="size-4"
                      onClick={() => {
                        setEditorId(todo.draft);
                        setEditorDialogOpen(true);
                      }}
                    >
                      <NotepadText className="text-muted-foreground" />
                    </Button>
                  )}
                </span>
              </CardContent>
            </ContextMenuTrigger>
            <TodayTodoMenuContent />
          </ContextMenu>
        </Card>

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
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
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
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
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
      </>
    )
  );
};

export const CompletedTodoView = ({
  id,
  collectionId,
}: {
  id: number;
  collectionId: number;
}) => {
  const { data: todo } = useTodo(id);
  const restoreTodoMutation = useRestoreTodo();
  const deleteTodoMutation = useDeleteTodo(collectionId, true);
  const deleteTodo = async () => {
    await deleteTodoMutation.mutateAsync(id);
  };
  const restoreTodo = async () => {
    await restoreTodoMutation.mutateAsync({ id, collectionId });
  };
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();

  return (
    todo && (
      <Card className="group relative rounded-sm py-2 opacity-75 transition-all select-none xl:select-auto">
        {/* Difficulty indicator - left border stripe */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
        />
        <ContextMenu>
          <ContextMenuTrigger>
            <CardContent className="group flex items-center gap-3 pr-2">
              <div className="text-muted-foreground min-w-0 flex-1 text-sm line-through">
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
              </div>

              <span className="flex items-center gap-1">
                {/* Complete date badge */}
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-xs"
                >
                  {new Date(todo.createdAt).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </Badge>
                {todo.draft !== 0 && (
                  <Button
                    variant="ghost"
                    className="size-8"
                    onClick={() => {
                      setEditorId(todo.draft);
                      setEditorDialogOpen(true);
                    }}
                  >
                    <NotepadText className="text-muted-foreground" />
                  </Button>
                )}
              </span>
            </CardContent>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={restoreTodo}>
              <ArchiveRestore />
              Restore
            </ContextMenuItem>
            <ContextMenuItem
              onClick={deleteTodo}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="text-destructive" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Card>
    )
  );
};

export const TodoEntry = ({
  id,
  collectionId,
}: {
  id: number;
  collectionId: number;
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const { data: collections } = useCollections();
  const { data: todo } = useTodo(id);
  // to-do state
  const [editTodoDialogOpen, setEditTodoDialogOpen] = useState(false);
  const [editTodoName, setEditTodoName] = useState("");
  const deleteTodoMutation = useDeleteTodo(collectionId);
  const updateTodoMutation = useUpdateTodo();
  const undoneTodoMutation = useUndoneTodo();
  const updateScheduleMutation = useUpdateSchedule();
  const doneTodoMutation = useDoneTodo();
  const unsetLinkMutation = useUnsetLink();
  const completeTodoMutation = useCompleteTodo();
  const moveTodoMutation = useMoveTodo();
  const deleteTodo = () => {
    setConfirmAction("delete");
    setAction(() => () => deleteTodoMutation.mutateAsync(id));
    setConfirmDialogOpen(true);
  };
  const doneTodo = async () => {
    await doneTodoMutation.mutateAsync({ id });
  };
  const undoneTodo = async () => {
    await undoneTodoMutation.mutateAsync({ id });
  };
  const completeTodo = () => {
    setConfirmAction("complete");
    // setAction treats a function as an updater
    // wrap actual function to avoid React calling it with the previous state as an argument
    setAction(
      () => () => completeTodoMutation.mutateAsync({ id, collectionId }),
    );
    setConfirmDialogOpen(true);
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
      await unsetLinkMutation.mutateAsync({ id });
    } else {
      await updateTodoMutation.mutateAsync({ id, link });
    }
  };
  // date state
  const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined | null>(
    undefined,
  );
  const updateScheduleDate = async (date: Date | undefined | null) => {
    if (!date) {
      return;
    }
    await updateScheduleMutation.mutateAsync({ id, schedule: date });
  };
  const unsetScheduleDate = async () => {
    await updateScheduleMutation.mutateAsync({ id, schedule: new Date(0) });
  };
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const updateTodoDraft = async (draftId: number) => {
    await updateTodoMutation.mutateAsync({ id, draft: draftId });
  };
  // confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [action, setAction] = useState(() => () => {}); // lazy initializer: func will execute immediately

  const TodoMenuContent = () =>
    todo && (
      <ContextMenuContent>
        {/* set today and completed: false  -->  ["Reset Date","Unset Date"] */}
        {/* set today and completed: true  -->  ["Reset Date"] */}
        {/* set date (not today) and done: false  -->  ["Reset Date","Unset Date"] */}
        {/* set date (not today) and done: true  --> should not exist  */}
        {collectionId !== 0 &&
          (todo.schedule && isSetDate(todo.schedule) ? (
            <>
              <ContextMenuItem
                onClick={() => {
                  setScheduleDate(todo.schedule);
                  setEditDateDialogOpen(true);
                }}
              >
                <CalendarDays />
                Reset Date
              </ContextMenuItem>
              {!todo.done && (
                <ContextMenuItem onClick={unsetScheduleDate}>
                  <X />
                  Unset Date
                </ContextMenuItem>
              )}
            </>
          ) : (
            <ContextMenuItem
              onClick={() => {
                setScheduleDate(todo.schedule);
                setEditDateDialogOpen(true);
              }}
            >
              <CalendarIcon />
              Set Date
            </ContextMenuItem>
          ))}
        {collectionId !== 0 &&
          (isSetToday(todo.schedule) ? (
            todo.done ? (
              <>
                <ContextMenuItem onClick={undoneTodo}>
                  <Undo2 />
                  Undone
                </ContextMenuItem>
                <ContextMenuItem onClick={completeTodo}>
                  <Archive />
                  Complete
                </ContextMenuItem>
              </>
            ) : (
              <ContextMenuItem onClick={doneTodo}>
                <CircleCheckBig />
                Done
              </ContextMenuItem>
            )
          ) : (
            <ContextMenuItem onClick={completeTodo}>
              <Archive />
              Complete
            </ContextMenuItem>
          ))}
        {collectionId !== 0 && <ContextMenuSeparator />}
        <ContextMenuItem
          onClick={() => {
            setEditTodoName(todo.title);
            setEditTodoDialogOpen(true);
          }}
        >
          <Edit />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setEditLinkName(todo.link);
            setEditLinkDialogOpen(true);
          }}
        >
          <Link />
          Link
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            if (todo.draft !== 0) {
              setEditorId(todo.draft);
              setEditorDialogOpen(true);
            } else {
              const draftId = await createTiptap();
              setEditorId(draftId);
              setEditorDialogOpen(true);
              updateTodoDraft(draftId);
            }
          }}
        >
          <NotepadText />
          Draft
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <div className="flex items-center gap-2">
              <ListEnd className="text-muted-foreground" />
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
          <Trash2 className="text-destructive" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    );

  return (
    todo && (
      <Card className="group relative rounded-sm py-2 transition-all select-none xl:select-auto">
        {/* Difficulty indicator - left border stripe */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
        />
        <ContextMenu>
          <ContextMenuTrigger>
            <CardContent className="group flex items-center gap-3 pr-2">
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
                <div className="mt-1 hidden items-center gap-1 xl:flex">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onMouseEnter={() => setDifficultyLabel(level)}
                        onMouseLeave={() => setDifficultyLabel(0)}
                        onClick={() =>
                          updateDifficulty(
                            level === todo.difficulty ? -1 : level,
                          )
                        }
                        className={`h-2 w-2 cursor-pointer rounded-full transition-all hover:scale-125 ${dotColor(level, todo.difficulty)}`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-muted-foreground ml-1 text-xs opacity-0 ${difficultyLabel !== 0 && "opacity-100"}`}
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

              <span className="flex items-center">
                {/* Schedule date badge */}
                {collectionId !== 0 && (
                  <Badge
                    variant="outline"
                    onClick={() => {
                      // only clickable when is set today
                      if (isSetToday(todo.schedule) && !todo.done) {
                        // remove Today
                        unsetScheduleDate();
                      } else if (!isSetDate(todo.schedule)) {
                        // set Today
                        updateScheduleDate(todayStart());
                      }
                    }}
                    className={`pointer-events-none mr-1 text-xs transition-transform xl:pointer-events-auto ${
                      // hover effect only when not set date or set today and not done
                      (!isSetDate(todo.schedule) ||
                        (isSetToday(todo.schedule) && !todo.done)) &&
                      "cursor-pointer hover:scale-110"
                    } ${formatDate(todo.schedule, todo.done).color}`}
                  >
                    {formatDate(todo.schedule, todo.done).label}
                  </Badge>
                )}
                {todo.draft !== 0 && (
                  <Button
                    variant="ghost"
                    className="size-8"
                    onClick={() => {
                      setEditorId(todo.draft);
                      setEditorDialogOpen(true);
                    }}
                  >
                    <NotepadText className="text-muted-foreground" />
                  </Button>
                )}
              </span>
            </CardContent>
          </ContextMenuTrigger>
          <TodoMenuContent />
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
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
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
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposing) {
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
                          <CalendarDays className="text-muted-foreground" />
                          {new Date(scheduleDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="text-muted-foreground" />
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

        {/* confirm Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to [{confirmAction}] {todo.title}?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction === "delete" ? "destructive" : undefined}
                onClick={() => {
                  action();
                  setConfirmDialogOpen(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    )
  );
};
