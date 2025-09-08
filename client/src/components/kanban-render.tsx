"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import * as Kanban from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import {
  Edit,
  ListPlus,
  MoreHorizontal,
  Plus,
  Save,
  TextCursorInput,
  Trash2,
} from "lucide-react";
import { useKanbanContext } from "@/components/kanban";
import { dateString } from "@/lib/utils";
import {
  type Task,
  type Kanban as KanbanObj,
  syncKanban,
  removeKanbanQuery,
  invalidateKanbanQuery,
} from "@/hooks/use-kanban";
import { toast } from "sonner";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import PopoverText from "@/components/popovertext";

export default function KanbanRender({ data }: { data: KanbanObj }) {
  const { language } = useUserContext();
  const { setId: setKanbanId, setOpen: setKanbanDialogOpen } =
    useKanbanContext();

  const [isComposing, setIsComposing] = useState(false);

  const [addBoardDialogOpen, setAddBoardDialogOpen] = useState(false);
  const [addBoardName, setAddBoardName] = useState("");

  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [addItemName, setAddItemName] = useState("");

  const [editListDialogOpen, setEditListDialogOpen] = useState(false);
  const [editListName, setEditListName] = useState("");

  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  const [actionObjName, setActionObjName] = useState("");

  const onAddBoard = () => {
    setColumns((prev) => [...prev, addBoardName]);
    setColumnValue((prev) => {
      return {
        ...prev,
        [addBoardName]: [],
      };
    });
  };

  const onAddItem = () => {
    setColumnValue((prev) => {
      return {
        ...prev,
        [actionObjName]: [
          {
            id: Date.now().toString(),
            title: addItemName,
            priority: "low",
          },
          ...prev[actionObjName],
        ],
      };
    });
  };

  const onRename = () => {
    setColumns((prev) =>
      prev.map((col) => (col === actionObjName ? editListName : col)),
    );
    setColumnValue((prev) => {
      return Object.fromEntries(
        Object.entries(prev).map(([k, v]) =>
          k === actionObjName ? [editListName, v] : [k, v],
        ),
      );
    });
  };

  const onDelete = () => {
    setColumns((prev) => prev.filter((col) => col !== actionObjName));

    const newColumns = { ...columnValue };
    delete newColumns[actionObjName];
    setColumnValue(newColumns);
  };

  const isDirtyRef = useRef(false);
  const isChanged = useRef(false);
  const prevTs = useRef(data.ts);

  const handleOutOfSync = () => {
    isDirtyRef.current = false;
    invalidateKanbanQuery(data.id);
    alert(i18nText[language].outOfSync);
  };

  const [columnValue, setColumnValue] = useState<Record<string, Task[]>>(
    data.content.columnValue,
  );
  const [columns, setColumns] = useState<string[]>(data.content.columns);
  const columnValueRef = useRef(columnValue);
  const columnsRef = useRef(columns);
  useEffect(() => {
    isDirtyRef.current = true;
    isChanged.current = true;
    columnValueRef.current = columnValue;
    columnsRef.current = columns;
  }, [columnValue]);

  useEffect(() => {
    setTimeout(() => {
      isDirtyRef.current = false;
      isChanged.current = false;
    }, 0);
    // sync every 5 seconds
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        const currTs = Date.now();
        syncKanban({
          id: data.id,
          content: {
            columns: columnsRef.current,
            columnValue: columnValueRef.current,
          },
          prev: prevTs.current,
          curr: currTs,
        })
          .then(() => {
            isDirtyRef.current = false;
            prevTs.current = currTs;
          })
          .catch(handleOutOfSync);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // warning before reload or leave page
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      // Cancel the event as permitted by the standard
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  const handleSave = () => {
    isDirtyRef.current = false;
    if (isChanged.current) {
      syncKanban({
        id: data.id,
        content: {
          columns: columnsRef.current,
          columnValue: columnValueRef.current,
        },
        prev: -1,
        curr: Date.now(),
      }).then(() => {
        toast.success(i18nText[language].success);
        setKanbanId(0);
        setKanbanDialogOpen(false);
        removeKanbanQuery(data.id);
      });
    } else {
      setKanbanId(0);
      setKanbanDialogOpen(false);
      removeKanbanQuery(data.id);
    }
  };

  return (
    <div className="h-full py-6">
      <Kanban.Root
        value={columnValue}
        onValueChange={setColumnValue}
        getItemValue={(item) => item.id}
      >
        <Kanban.Board className="flex overflow-auto px-4">
          {columns.map((column) => (
            <Kanban.Column
              key={column}
              value={column}
              className="max-w-[360px] flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{column}</span>
                  <Badge
                    variant="outline"
                    className="pointer-events-none rounded-sm"
                  >
                    {columnValue[column].length}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-zinc-200"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setAddItemName("");
                        setActionObjName(column);
                        setAddItemDialogOpen(true);
                      }}
                    >
                      <ListPlus />
                      {i18nText[language].addItem}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditListName(column);
                        setActionObjName(column);
                        setEditListDialogOpen(true);
                      }}
                    >
                      <Edit />
                      {i18nText[language].renameBoard}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActionObjName(column);
                        setDeleteListDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="text-destructive" />
                      {i18nText[language].deleteBoard}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-col gap-2 overflow-scroll p-0.5">
                {columnValue[column].map((task) => (
                  <KanbanItem
                    key={task.id}
                    task={task}
                    columnName={column}
                    setColumns={setColumnValue}
                  />
                ))}
              </div>
            </Kanban.Column>
          ))}

          <div className="!w-[360px] flex-shrink-0">
            <div className="flex gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddBoardName("");
                  setAddBoardDialogOpen(true);
                }}
              >
                <Plus />
              </Button>
              <Button size="sm" variant="outline" onClick={handleSave}>
                <Save />
              </Button>
            </div>
          </div>
        </Kanban.Board>
        <Kanban.Overlay>
          <div className="bg-primary/10 size-full rounded-md" />
        </Kanban.Overlay>
      </Kanban.Root>

      {/* Create Board Dialog */}
      <Dialog open={addBoardDialogOpen} onOpenChange={setAddBoardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].addBoard}</DialogTitle>
            <DialogDescription>
              {i18nText[language].addBoardDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={i18nText[language].enterNewName}
              value={addBoardName}
              onChange={(e) => setAddBoardName(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  onAddBoard();
                  setAddBoardDialogOpen(false);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddBoardDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  onAddBoard();
                  setAddBoardDialogOpen(false);
                }}
                disabled={!addBoardName.trim()}
              >
                {i18nText[language].add}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].addItem}</DialogTitle>
            <DialogDescription>
              {i18nText[language].addItemDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={i18nText[language].enterNewName}
              value={addItemName}
              onChange={(e) => setAddItemName(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  onAddItem();
                  setAddItemDialogOpen(false);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddItemDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  onAddItem();
                  setAddItemDialogOpen(false);
                }}
                disabled={!addItemName.trim()}
              >
                {i18nText[language].add}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={editListDialogOpen} onOpenChange={setEditListDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].renameBoard}</DialogTitle>
            <DialogDescription>
              {i18nText[language].renameBoardDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={i18nText[language].enterNewName}
              value={editListName}
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
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  onRename();
                  setEditListDialogOpen(false);
                }}
                disabled={!editListName.trim()}
              >
                {i18nText[language].rename}
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
            <AlertDialogTitle>
              {i18nText[language].deleteBoard}
            </AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              {i18nText[language].deleteBoardDescStart}
              {actionObjName}
              {i18nText[language].deleteBoardDescEnd}
              <br />
              {i18nText[language].alert}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18nText[language].cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteListDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              {i18nText[language].delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const KanbanItem = ({
  task,
  columnName,
  setColumns,
}: {
  task: Task;
  columnName: string;
  setColumns: (value: React.SetStateAction<Record<string, Task[]>>) => void;
}) => {
  const { language } = useUserContext();
  const [isComposing, setIsComposing] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editItemName, setEditItemName] = useState("");
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [editDetailDialogOpen, setEditDetailDialogOpen] = useState(false);
  const [itemDetail, setItemDetail] = useState("");

  const onRename = () => {
    setColumns((prev: Record<string, Task[]>) => {
      return Object.fromEntries(
        Object.entries(prev).map(([k, v]) =>
          k === columnName
            ? [
                k,
                v.map((item) =>
                  item.id === task.id ? { ...item, title: editItemName } : item,
                ),
              ]
            : [k, v],
        ),
      );
    });
  };

  const onUpdateDetail = () => {
    setColumns((prev: Record<string, Task[]>) => {
      return Object.fromEntries(
        Object.entries(prev).map(([k, v]) =>
          k === columnName
            ? [
                k,
                v.map((item) =>
                  item.id === task.id ? { ...item, detail: itemDetail } : item,
                ),
              ]
            : [k, v],
        ),
      );
    });
  };

  const onDelete = () => {
    setColumns((prev: Record<string, Task[]>) => {
      return Object.fromEntries(
        Object.entries(prev).map(([k, v]) =>
          k === columnName
            ? [k, v.filter((item) => item.id !== task.id)]
            : [k, v],
        ),
      );
    });
  };

  const isMobile = useIsMobile();

  return (
    <>
      <Kanban.Item key={task.id} value={task.id} asHandle asChild>
        <div className="bg-card rounded-md border p-3 shadow-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                {task.detail ? (
                  isMobile ? (
                    <PopoverText
                      className="dashed-text truncate text-sm font-medium"
                      text={task.title}
                      detail={task.detail}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                    />
                  ) : (
                    <HoverCard>
                      <HoverCardTrigger>
                        <span className="dashed-text truncate text-sm font-medium">
                          {task.title}
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent>{task.detail}</HoverCardContent>
                    </HoverCard>
                  )
                ) : (
                  <span className="truncate text-sm font-medium">
                    {task.title}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      task.priority === "high"
                        ? "destructive"
                        : task.priority === "medium"
                          ? "default"
                          : "secondary"
                    }
                    className="pointer-events-none h-5 rounded-sm px-1.5 text-[11px] capitalize"
                  >
                    {task.priority}
                  </Badge>
                  {task.dueDate && (
                    <div className="text-xs tabular-nums">
                      {dateString(task.dueDate, "-")}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditItemName(task.title);
                        setEditItemDialogOpen(true);
                      }}
                    >
                      <TextCursorInput className="text-muted-foreground" />
                      {i18nText[language].renameItem}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemDetail(task.detail ?? "");
                        setEditDetailDialogOpen(true);
                      }}
                    >
                      <Edit />
                      {i18nText[language].editDetail}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteItemDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="text-destructive" />
                      {i18nText[language].deleteItem}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </Kanban.Item>

      {/* Edit Item Dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].renameItem}</DialogTitle>
            <DialogDescription>
              {i18nText[language].renameItemDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={i18nText[language].enterNewName}
              value={editItemName}
              onChange={(e) => setEditItemName(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  onRename();
                  setEditItemDialogOpen(false);
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditItemDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  onRename();
                  setEditItemDialogOpen(false);
                }}
                disabled={!editItemName.trim()}
              >
                {i18nText[language].rename}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Detail Dialog */}
      <Dialog
        open={editDetailDialogOpen}
        onOpenChange={setEditDetailDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].editDetail}</DialogTitle>
            <DialogDescription>
              {i18nText[language].editDetailDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={i18nText[language].enterDetails}
              value={itemDetail}
              onChange={(e) => setItemDetail(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDetailDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  onUpdateDetail();
                  setEditDetailDialogOpen(false);
                }}
                disabled={!itemDetail.trim()}
              >
                {i18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <AlertDialog
        open={deleteItemDialogOpen}
        onOpenChange={setDeleteItemDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18nText[language].deleteItem}</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              {i18nText[language].deleteItemDescStart}
              {task.title}
              {i18nText[language].deleteItemDescEnd}
              <br />
              {i18nText[language].alert}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18nText[language].cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteItemDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              {i18nText[language].delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const i18nText = {
  [UserLangEnum.ZHCN]: {
    outOfSync: "🔄 看板内容有更新！",
    addItem: "添加事项",
    renameBoard: "重命名看板",
    deleteBoard: "删除看板",
    renameItem: "重命名事项",
    editDetail: "编辑详情",
    deleteItem: "删除事项",
    addBoard: "添加看板",
    addBoardDesc: "请输入新看板的名称。",
    addItemDesc: "请输入新事项的名称。",
    renameBoardDesc: "请输入看板的新名称。",
    renameItemDesc: "请输入事项的新名称。",
    editDetailDesc: "请输入事项的详情。",
    deleteBoardTitle: "删除看板",
    deleteBoardDescStart: "你确定要删除 [",
    deleteBoardDescEnd: "] 吗？",
    deleteItemDescStart: "你确定要删除 [",
    deleteItemDescEnd: "] 吗？",
    alert: "此操作无法撤销。",
    enterNewName: "输入新名称...",
    enterDetails: "输入详情...",
    cancel: "取消",
    add: "添加",
    rename: "重命名",
    update: "更新",
    delete: "删除",
    success: "看板保存成功",
  },
  [UserLangEnum.ENUS]: {
    outOfSync: "🔄 Kanban content is out of sync!",
    addItem: "Add Item",
    renameBoard: "Rename Board",
    deleteBoard: "Delete Board",
    renameItem: "Rename Item",
    editDetail: "Edit Details",
    deleteItem: "Delete Item",
    addBoard: "Add Board",
    addBoardDesc: "Enter a name for your new board.",
    addItemDesc: "Enter a name for your new item.",
    renameBoardDesc: "Enter a new name for your board.",
    renameItemDesc: "Enter a new name for your item.",
    editDetailDesc: "Enter details for your item.",
    deleteBoardTitle: "Delete Board",
    deleteBoardDescStart: "Are you sure you want to delete [",
    deleteBoardDescEnd: "]?",
    deleteItemDescStart: "Are you sure you want to delete [",
    deleteItemDescEnd: "]?",
    alert: "This action cannot be undone.",
    enterNewName: "Enter new name...",
    enterDetails: "Enter new details...",
    cancel: "Cancel",
    add: "Add",
    rename: "Rename",
    update: "Update",
    delete: "Delete",
    success: "Kanban saved successfully",
  },
};
