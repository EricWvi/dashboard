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
  CornerLeftUp,
  SquareKanban,
  CalendarOff,
  CalendarPlus,
  Timer,
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
import PopoverText from "@/components/popovertext";
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
  useTopTodo,
  useUndoneTodo,
  useUnsetLink,
  useUpdateSchedule,
  useUpdateTodo,
  type Todo,
} from "@/hooks/use-todos";
import {
  stripeColor,
  formatDate,
  isSetDate,
  isSetToday,
  todayStart,
  dotColor,
  tomorrowStart,
  underlineColor,
  noPlanStart,
  isDisabledPlan,
  fullDateString,
} from "@/lib/utils";
import { useTTContext } from "@/components/editor";
import { useKanbanContext } from "@/components/kanban";
import { createTiptap } from "@/hooks/use-draft";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createKanban } from "@/hooks/use-kanban";
import { useIsMobile } from "@/hooks/use-mobile";
import { BasicCannon, CannonMix, SchoolPride } from "@/lib/confetti";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

const TodoTitle = ({
  todo,
  todayView,
  children,
}: { todo: Todo; todayView?: boolean } & { children?: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const todoText = `${todo.title}${todo.completed ? ` (${todo.count})` : ""}`;
  return (
    <div
      className={`min-w-0 text-sm ${(todayView && todo.done) || todo.completed ? "text-muted-foreground line-through" : ""}`}
    >
      {isMobile ? (
        <PopoverText text={todoText} />
      ) : todo.link === "" ? (
        <div title={todo.title} className="truncate">
          {todoText}
        </div>
      ) : (
        <a
          className="font-medium"
          title={todo.title}
          href={todo.link}
          target="_blank"
        >
          <div className="flex">
            <div className="dashed-text truncate">{todoText}</div>
          </div>
        </a>
      )}

      {children}
    </div>
  );
};

export const PlanTodoView = ({
  todo,
  disabled,
  isFuture,
  handleCheck,
}: {
  todo: Todo;
  disabled: boolean;
  isFuture: boolean;
  handleCheck: (id: number, checked: boolean) => void;
}) => {
  const { language } = useUserContext();
  return (
    <div className="flex items-center gap-2">
      {isFuture ? (
        <Badge
          variant="outline"
          className={`text-xs ${formatDate(todo.schedule, todo.done).color}`}
        >
          {formatDate(todo.schedule, todo.done).label[language]}
        </Badge>
      ) : (
        <Checkbox
          id={String(todo.id)}
          defaultChecked={disabled}
          disabled={disabled}
          className="cursor-pointer"
          onCheckedChange={(checked: boolean) => handleCheck(todo.id, checked)}
        />
      )}
      <div className="min-w-0 flex-1">
        <Label htmlFor={String(todo.id)}>
          <div
            className={`truncate text-base ${underlineColor(todo.difficulty)}`}
          >
            {todo.title}
          </div>
        </Label>
      </div>
    </div>
  );
};

const todayTodoViewI18N = {
  [UserLangEnum.ZHCN]: {
    start: "开始",
    renameTodo: "重命名待办事项",
    enterNewName: "输入待办事项的新名称",
    enterNewNamePlaceholder: "输入新名称...",
    rename: "重命名",
    cancel: "取消",
    link: "链接",
    changeLink: "更改链接",
    changeLinkDesc: "设置以在新页面中打开链接",
    changeLinkPlaceholder: "输入新链接...",
    set: "设置",
    draft: "草稿",
    kanban: "看板",
    done: "完成",
    undone: "未完成",
    unsetDate: "取消日期",
  },
  [UserLangEnum.ENUS]: {
    start: "Start",
    renameTodo: "Rename Todo",
    enterNewName: "Enter a new name for your todo.",
    enterNewNamePlaceholder: "Enter new name...",
    rename: "Rename",
    cancel: "Cancel",
    link: "Link",
    changeLink: "Change Link",
    changeLinkDesc: "Set a link to redirect.",
    changeLinkPlaceholder: "Enter new link...",
    set: "Set",
    draft: "Draft",
    kanban: "Kanban",
    done: "Done",
    undone: "Undone",
    unsetDate: "Unset Date",
  },
};

export const TodayTodoView = ({ id }: { id: number }) => {
  const { language } = useUserContext();
  const [isComposing, setIsComposing] = useState(false);
  const { data: todo } = useTodo(id);

  // to-do state
  const [editTodoDialogOpen, setEditTodoDialogOpen] = useState(false);
  const [editTodoName, setEditTodoName] = useState("");
  const updateTodoMutation = useUpdateTodo();
  const undoneTodoMutation = useUndoneTodo();
  const doneTodoMutation = useDoneTodo();
  const unsetLinkMutation = useUnsetLink();
  const updateScheduleMutation = useUpdateSchedule();
  const renameTodo = async () => {
    await updateTodoMutation.mutateAsync({ id, title: editTodoName });
  };
  const doneTodo = async () => {
    await doneTodoMutation.mutateAsync({ id });
  };
  const undoneTodo = async () => {
    await undoneTodoMutation.mutateAsync({ id });
  };
  const unsetScheduleDate = async () => {
    await updateScheduleMutation.mutateAsync({ id, schedule: new Date(0) });
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
  // kanban state
  const { setId: setKanbanId, setOpen: setKanbanDialogOpen } =
    useKanbanContext();
  const updateTodoKanban = async (kanbanId: number) => {
    await updateTodoMutation.mutateAsync({ id, kanban: kanbanId });
  };
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const updateTodoDraft = async (draftId: number) => {
    await updateTodoMutation.mutateAsync({ id, draft: draftId });
  };

  if (!todo) return null;

  const TodayTodoMenuContent = () => (
    <ContextMenuContent>
      {!todo.done && (
        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(todo.title);
            window.open(
              "https://timetagger.onlyquant.top/timetagger/app/",
              "_blank",
            );
          }}
        >
          <Timer />
          {todayTodoViewI18N[language].start}
        </ContextMenuItem>
      )}
      {todo.done ? (
        <ContextMenuItem onClick={undoneTodo}>
          <Undo2 />
          {todayTodoViewI18N[language].undone}
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={doneTodo}>
          <CircleCheckBig />
          {todayTodoViewI18N[language].done}
        </ContextMenuItem>
      )}
      {!todo.done && (
        <ContextMenuItem onClick={unsetScheduleDate}>
          <X />
          {todayTodoViewI18N[language].unsetDate}
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          setEditTodoName(todo.title);
          setEditTodoDialogOpen(true);
        }}
      >
        <Edit />
        {todayTodoViewI18N[language].rename}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setEditLinkName(todo.link);
          setEditLinkDialogOpen(true);
        }}
      >
        <Link />
        {todayTodoViewI18N[language].link}
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
        {todayTodoViewI18N[language].draft}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={async () => {
          if (todo.kanban !== 0) {
            setKanbanId(todo.kanban);
            setKanbanDialogOpen(true);
          } else {
            const kanbanId = await createKanban(language);
            setKanbanId(kanbanId);
            setKanbanDialogOpen(true);
            updateTodoKanban(kanbanId);
          }
        }}
      >
        <SquareKanban />
        {todayTodoViewI18N[language].kanban}
      </ContextMenuItem>
    </ContextMenuContent>
  );

  return (
    <>
      <Card
        className={`group relative rounded-sm py-2 transition-all select-none xl:select-auto ${todo.done ? "opacity-75" : ""}`}
      >
        {/* Difficulty indicator - left border stripe */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
        />
        <ContextMenu>
          <ContextMenuTrigger>
            <CardContent className="group flex items-center justify-between pr-2 pl-4 lg:pl-6">
              <TodoTitle todo={todo} todayView />
              <span className="flex items-center gap-1">
                {todo.kanban !== 0 && (
                  <Button
                    variant="ghost"
                    className="size-4 xl:size-6"
                    onClick={() => {
                      setKanbanId(todo.kanban);
                      setKanbanDialogOpen(true);
                    }}
                  >
                    <SquareKanban className="text-muted-foreground" />
                  </Button>
                )}
                {todo.draft !== 0 && (
                  <Button
                    variant="ghost"
                    className="size-4 xl:size-6"
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
            <DialogTitle>{todayTodoViewI18N[language].renameTodo}</DialogTitle>
            <DialogDescription>
              {todayTodoViewI18N[language].enterNewName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={todayTodoViewI18N[language].enterNewNamePlaceholder}
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
                {todayTodoViewI18N[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  renameTodo();
                  setEditTodoDialogOpen(false);
                }}
                disabled={!editTodoName.trim() || updateTodoMutation.isPending}
              >
                {todayTodoViewI18N[language].rename}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit link Dialog */}
      <Dialog open={editLinkDialogOpen} onOpenChange={setEditLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{todayTodoViewI18N[language].changeLink}</DialogTitle>
            <DialogDescription>
              {todayTodoViewI18N[language].changeLinkDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={todayTodoViewI18N[language].changeLinkPlaceholder}
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
                {todayTodoViewI18N[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  changeLink(editLinkName);
                  setEditLinkDialogOpen(false);
                }}
                disabled={updateTodoMutation.isPending}
              >
                {todayTodoViewI18N[language].set}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const completedTodoViewI18N = {
  [UserLangEnum.ZHCN]: {
    restore: "恢复",
    delete: "删除",
  },
  [UserLangEnum.ENUS]: {
    restore: "Restore",
    delete: "Delete",
  },
};

export const CompletedTodoView = ({
  id,
  collectionId,
}: {
  id: number;
  collectionId: number;
}) => {
  const { language } = useUserContext();
  const { data: todo } = useTodo(id);

  const restoreTodoMutation = useRestoreTodo();
  const deleteTodoMutation = useDeleteTodo(collectionId, true);
  const deleteTodo = async () => {
    await deleteTodoMutation.mutateAsync(id);
  };
  const restoreTodo = async () => {
    await restoreTodoMutation.mutateAsync({ id, collectionId });
  };
  // kanban state
  const { setId: setKanbanId, setOpen: setKanbanDialogOpen } =
    useKanbanContext();
  // editor state
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();

  if (!todo) return null;

  return (
    <Card className="group relative rounded-sm py-2 opacity-75 transition-all select-none xl:select-auto">
      {/* Difficulty indicator - left border stripe */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
      />
      <ContextMenu>
        <ContextMenuTrigger>
          <CardContent className="group flex items-center justify-between pr-2 pl-4 lg:pl-6">
            <TodoTitle todo={todo} />

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
              {todo.kanban !== 0 && (
                <Button
                  variant="ghost"
                  className="mx-1 size-4 xl:mx-0 xl:size-8"
                  onClick={() => {
                    setKanbanId(todo.kanban);
                    setKanbanDialogOpen(true);
                  }}
                >
                  <SquareKanban className="text-muted-foreground" />
                </Button>
              )}
              {todo.draft !== 0 && (
                <Button
                  variant="ghost"
                  className="size-4 xl:size-8"
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
            {completedTodoViewI18N[language].restore}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={deleteTodo}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="text-destructive" />
            {completedTodoViewI18N[language].delete}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </Card>
  );
};

export const TodoEntry = ({
  id,
  collectionId,
  top,
}: {
  id: number;
  collectionId: number;
  top: boolean;
}) => {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
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
  const topTodoMutation = useTopTodo();
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
  const topTodo = async () => {
    await topTodoMutation.mutateAsync({ id, collectionId });
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
  // kanban state
  const { setId: setKanbanId, setOpen: setKanbanDialogOpen } =
    useKanbanContext();
  const updateTodoKanban = async (kanbanId: number) => {
    await updateTodoMutation.mutateAsync({ id, kanban: kanbanId });
  };
  // confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [action, setAction] = useState<() => Promise<any>>(
    () => () => Promise.resolve(),
  ); // lazy initializer: func will execute immediately

  if (!todo) return null;

  const TodoMenuContent = () => (
    <ContextMenuContent>
      {collectionId !== 0 &&
        (isSetToday(todo.schedule) ? (
          todo.done ? (
            <>
              <ContextMenuItem onClick={undoneTodo}>
                <Undo2 />
                {todoEntryI18NText[language].undone}
              </ContextMenuItem>
              <ContextMenuItem onClick={completeTodo}>
                <Archive />
                {todoEntryI18NText[language].complete}
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem onClick={doneTodo}>
              <CircleCheckBig />
              {todoEntryI18NText[language].done}
            </ContextMenuItem>
          )
        ) : (
          <ContextMenuItem onClick={completeTodo}>
            <Archive />
            {todoEntryI18NText[language].complete}
          </ContextMenuItem>
        ))}
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
              {todoEntryI18NText[language].resetDate}
            </ContextMenuItem>
            {!todo.done && (
              <ContextMenuItem onClick={unsetScheduleDate}>
                <X />
                {todoEntryI18NText[language].unsetDate}
              </ContextMenuItem>
            )}
          </>
        ) : (
          <>
            <ContextMenuItem
              onClick={() => {
                setScheduleDate(todo.schedule);
                setEditDateDialogOpen(true);
              }}
            >
              <CalendarIcon />
              {todoEntryI18NText[language].setDate}
            </ContextMenuItem>
            {!isDisabledPlan(todo.schedule) ? (
              <ContextMenuItem
                onClick={() => {
                  updateScheduleDate(noPlanStart());
                }}
              >
                <CalendarOff />
                {todoEntryI18NText[language].noPlan}
              </ContextMenuItem>
            ) : (
              <ContextMenuItem onClick={unsetScheduleDate}>
                <CalendarPlus />
                {todoEntryI18NText[language].usePlan}
              </ContextMenuItem>
            )}
          </>
        ))}
      {collectionId !== 0 && <ContextMenuSeparator />}
      <ContextMenuItem
        onClick={() => {
          setEditTodoName(todo.title);
          setEditTodoDialogOpen(true);
        }}
      >
        <Edit />
        {todoEntryI18NText[language].rename}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setEditLinkName(todo.link);
          setEditLinkDialogOpen(true);
        }}
      >
        <Link />
        {todoEntryI18NText[language].link}
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
        {todoEntryI18NText[language].draft}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={async () => {
          if (todo.kanban !== 0) {
            setKanbanId(todo.kanban);
            setKanbanDialogOpen(true);
          } else {
            const kanbanId = await createKanban(language);
            setKanbanId(kanbanId);
            setKanbanDialogOpen(true);
            updateTodoKanban(kanbanId);
          }
        }}
      >
        <SquareKanban />
        {todoEntryI18NText[language].kanban}
      </ContextMenuItem>
      <ContextMenuSeparator />
      {!top && (
        <ContextMenuItem onClick={topTodo}>
          <CornerLeftUp />
          {todoEntryI18NText[language].top}
        </ContextMenuItem>
      )}
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <div className="flex items-center gap-2">
            <ListEnd className="text-muted-foreground" />
            {todoEntryI18NText[language].moveTo}
          </div>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {collections
            ?.filter((c) => c.id !== collectionId && c.id !== 0)
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
        {todoEntryI18NText[language].delete}
      </ContextMenuItem>
    </ContextMenuContent>
  );

  return (
    <Card className="group relative rounded-sm py-2 transition-all select-none xl:select-auto">
      {/* Difficulty indicator - left border stripe */}
      <div
        className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(todo.difficulty)}`}
      />
      <ContextMenu>
        <ContextMenuTrigger>
          <CardContent className="group flex items-center justify-between pr-2 pl-4 lg:pl-6">
            <TodoTitle todo={todo}>
              {/* Difficulty dots indicator */}
              <div className="mt-1 hidden items-center gap-1 xl:flex">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      onMouseEnter={() => setDifficultyLabel(level)}
                      onMouseLeave={() => setDifficultyLabel(0)}
                      onClick={() =>
                        updateDifficulty(level === todo.difficulty ? -1 : level)
                      }
                      className={`h-2 w-2 cursor-pointer rounded-full transition-all hover:scale-125 ${dotColor(level, todo.difficulty)}`}
                    />
                  ))}
                </div>
                <span
                  className={`text-muted-foreground ml-1 text-xs opacity-0 ${difficultyLabel !== 0 ? "opacity-100" : ""}`}
                >
                  {difficultyLabel === 1
                    ? todoEntryI18NText[language].easy
                    : difficultyLabel === 2
                      ? todoEntryI18NText[language].medium
                      : difficultyLabel === 3
                        ? todoEntryI18NText[language].hard
                        : todoEntryI18NText[language].veryHard}
                </span>
              </div>
            </TodoTitle>

            <span className="flex items-center gap-1 xl:gap-0">
              {/* Schedule date badge */}
              {collectionId !== 0 && (
                <Badge
                  variant="outline"
                  onClick={() => {
                    // only clickable when is set today
                    if (isSetToday(todo.schedule) && !todo.done) {
                      // remove Today
                      unsetScheduleDate();
                    } else if (
                      !isSetDate(todo.schedule) &&
                      !isDisabledPlan(todo.schedule)
                    ) {
                      // set Today
                      updateScheduleDate(todayStart());
                    }
                  }}
                  className={`pointer-events-none mr-1 text-xs transition-transform xl:pointer-events-auto ${
                    // hover effect only when not set date or set today and not done
                    !isDisabledPlan(todo.schedule) &&
                    (!isSetDate(todo.schedule) ||
                      (isSetToday(todo.schedule) && !todo.done))
                      ? "cursor-pointer hover:scale-110"
                      : ""
                  } ${!isSetDate(todo.schedule) && !isDisabledPlan(todo.schedule) ? "hidden xl:inline" : "inline"} ${formatDate(todo.schedule, todo.done).color}`}
                >
                  {formatDate(todo.schedule, todo.done).label[language]}
                </Badge>
              )}
              {todo.kanban !== 0 && (
                <Button
                  variant="ghost"
                  className="size-4 xl:size-8"
                  onClick={() => {
                    setKanbanId(todo.kanban);
                    setKanbanDialogOpen(true);
                  }}
                >
                  <SquareKanban className="text-muted-foreground" />
                </Button>
              )}
              {todo.draft !== 0 && (
                <Button
                  variant="ghost"
                  className="size-4 xl:size-8"
                  onClick={() => {
                    setEditorId(todo.draft);
                    setEditorDialogOpen(true);
                  }}
                >
                  <NotepadText className="text-muted-foreground" />
                </Button>
              )}
              {isMobile && todo.link !== "" && (
                <Button
                  variant="ghost"
                  className="size-4 xl:size-8"
                  onClick={() => window.open(todo.link, "_blank")}
                >
                  <Link className="text-muted-foreground" />
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
            <DialogTitle>{todoEntryI18NText[language].renameTodo}</DialogTitle>
            <DialogDescription>
              {todoEntryI18NText[language].enterNewName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={todoEntryI18NText[language].enterNewNamePlaceholder}
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
                {todoEntryI18NText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  renameTodo();
                  setEditTodoDialogOpen(false);
                }}
                disabled={!editTodoName.trim() || updateTodoMutation.isPending}
              >
                {todoEntryI18NText[language].rename}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit link Dialog */}
      <Dialog open={editLinkDialogOpen} onOpenChange={setEditLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{todoEntryI18NText[language].changeLink}</DialogTitle>
            <DialogDescription>
              {todoEntryI18NText[language].setLinkDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={todoEntryI18NText[language].enterNewLinkPlaceholder}
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
                {todoEntryI18NText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  changeLink(editLinkName);
                  setEditLinkDialogOpen(false);
                }}
                disabled={updateTodoMutation.isPending}
              >
                {todoEntryI18NText[language].set}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit date Dialog */}
      <Dialog open={editDateDialogOpen} onOpenChange={setEditDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {todoEntryI18NText[language].setDateTitle}
            </DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {todoEntryI18NText[language].setDateDescStart}
              {todo.title}
              {todoEntryI18NText[language].setDateDescEnd}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  onClick={() => setScheduleDate(todayStart())}
                >
                  {todoEntryI18NText[language].today}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setScheduleDate(tomorrowStart())}
                >
                  {todoEntryI18NText[language].tomorrow}
                </Button>
              </div>
              <Popover open={openCalendar} onOpenChange={setOpenCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-fit justify-normal font-normal"
                  >
                    {scheduleDate && isSetDate(scheduleDate) ? (
                      <>
                        <CalendarDays className="text-muted-foreground" />
                        {fullDateString(scheduleDate, language)}
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="text-muted-foreground" />
                        {todoEntryI18NText[language].selectDate}
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
                {todoEntryI18NText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateScheduleDate(scheduleDate);
                  setEditDateDialogOpen(false);
                }}
                disabled={updateTodoMutation.isPending}
              >
                {todoEntryI18NText[language].apply}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {todoEntryI18NText[language].confirmAction}
            </DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {`${todoEntryI18NText[language].confirmActionDescStart}${
                confirmAction === "delete"
                  ? todoEntryI18NText[language].deleteAction
                  : todoEntryI18NText[language].completeAction
              }${todo.title}${todoEntryI18NText[language].confirmActionDescEnd}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {todoEntryI18NText[language].cancel}
            </Button>
            <Button
              variant={confirmAction === "delete" ? "destructive" : undefined}
              onClick={() => {
                action().then(() => {
                  setConfirmDialogOpen(false);
                  if (confirmAction === "complete") {
                    if (todo) {
                      if (todo.count >= 20) {
                        SchoolPride();
                      } else if (todo.count >= 10) {
                        CannonMix();
                      } else {
                        BasicCannon();
                      }
                    }
                  }
                });
              }}
            >
              {todoEntryI18NText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const todoEntryI18NText = {
  [UserLangEnum.ZHCN]: {
    easy: "简单",
    medium: "中等",
    hard: "困难",
    veryHard: "非常困难",
    done: "完成",
    undone: "未完成",
    top: "置顶",
    complete: "归档",
    setDate: "设置日期",
    resetDate: "更改日期",
    unsetDate: "取消日期",
    noPlan: "取消规划",
    usePlan: "恢复规划",
    renameTodo: "重命名待办事项",
    enterNewName: "输入待办事项的新名称",
    enterNewNamePlaceholder: "输入新名称...",
    cancel: "取消",
    rename: "重命名",
    link: "链接",
    draft: "草稿",
    moveTo: "移动到",
    delete: "删除",
    kanban: "看板",
    changeLink: "更改链接",
    setLinkDescription: "设置以在新页面中打开链接",
    enterNewLinkPlaceholder: "输入新链接...",
    set: "设置",
    apply: "应用",
    today: "今天",
    tomorrow: "明天",
    setDateTitle: "设置日期",
    setDateDescStart: "为待办事项「",
    setDateDescEnd: "」设置一个日期",
    selectDate: "选择日期",
    confirmAction: "确认操作",
    confirmActionDescStart: "确定要",
    confirmActionDescEnd: "」吗？",
    deleteAction: "删除「",
    completeAction: "完成「",
    confirm: "确认",
  },
  [UserLangEnum.ENUS]: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    veryHard: "Very Hard",
    done: "Done",
    undone: "Undone",
    top: "Top",
    complete: "Complete",
    setDate: "Set Date",
    resetDate: "Reset Date",
    unsetDate: "Unset Date",
    noPlan: "No Plan",
    usePlan: "Use Plan",
    renameTodo: "Rename Todo",
    enterNewName: "Enter a new name for your todo.",
    enterNewNamePlaceholder: "Enter new name...",
    cancel: "Cancel",
    rename: "Rename",
    link: "Link",
    draft: "Draft",
    moveTo: "Move To",
    delete: "Delete",
    kanban: "Kanban",
    changeLink: "Change Link",
    setLinkDescription: "Set a link to redirect.",
    enterNewLinkPlaceholder: "Enter new link...",
    set: "Set",
    apply: "Apply",
    today: "Today",
    tomorrow: "Tomorrow",
    setDateTitle: "Set Date",
    setDateDescStart: "Set a date for the todo item [",
    setDateDescEnd: "].",
    selectDate: "Select date",
    confirmAction: "Confirm Action",
    confirmActionDescStart: "Are you sure you want to ",
    confirmActionDescEnd: "]?",
    deleteAction: "{delete} [",
    completeAction: "{complete} [",
    confirm: "Confirm",
  },
};
