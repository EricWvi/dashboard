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
} from "@/hooks/use-kanban";
import { toast } from "sonner";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";

export default function KanbanRender({ data }: { data: KanbanObj }) {
  const { setId, setOpen: setKanbanDialogOpen } = useKanbanContext();

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
        syncKanban({
          id: data.id,
          content: {
            columns: columnsRef.current,
            columnValue: columnValueRef.current,
          },
        });
        isDirtyRef.current = false;
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
    if (isChanged.current) {
      syncKanban({
        id: data.id,
        content: {
          columns: columnsRef.current,
          columnValue: columnValueRef.current,
        },
      }).then(() => {
        toast.success("Kanban saved successfully");
      });
    }
    setId(0);
    setKanbanDialogOpen(false);
    removeKanbanQuery(data.id);
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
                      Add Item
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditListName(column);
                        setActionObjName(column);
                        setEditListDialogOpen(true);
                      }}
                    >
                      <Edit />
                      Rename Board
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setActionObjName(column);
                        setDeleteListDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="text-destructive" />
                      Delete Board
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
            <DialogTitle>Add Board</DialogTitle>
            <DialogDescription>
              Enter a name for your new board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new name..."
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onAddBoard();
                  setAddBoardDialogOpen(false);
                }}
                disabled={!addBoardName.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Enter a name for your new item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new name..."
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onAddItem();
                  setAddItemDialogOpen(false);
                }}
                disabled={!addItemName.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={editListDialogOpen} onOpenChange={setEditListDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Board</DialogTitle>
            <DialogDescription>
              Enter a new name for your board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new name..."
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onRename();
                  setEditListDialogOpen(false);
                }}
                disabled={!editListName.trim()}
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
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              Are you sure you want to delete [{actionObjName}]? <br />
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

  return (
    <>
      <Kanban.Item key={task.id} value={task.id} asHandle asChild>
        <div className="bg-card rounded-md border p-3 shadow-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                {task.detail ? (
                  <HoverCard>
                    <HoverCardTrigger>
                      <span className="dashed-text truncate text-sm font-medium">
                        {task.title}
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent>{task.detail}</HoverCardContent>
                  </HoverCard>
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
                      Rename Item
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
                      Edit Detail
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
                      Delete Item
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
            <DialogTitle>Rename Item</DialogTitle>
            <DialogDescription>
              Enter a new name for your item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new name..."
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onRename();
                  setEditItemDialogOpen(false);
                }}
                disabled={!editItemName.trim()}
              >
                Rename
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
            <DialogTitle>Edit Details</DialogTitle>
            <DialogDescription>Enter details for your item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter new details..."
              value={itemDetail}
              onChange={(e) => setItemDetail(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditDetailDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onUpdateDetail();
                  setEditDetailDialogOpen(false);
                }}
                disabled={!itemDetail.trim()}
              >
                Update
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
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              Are you sure you want to delete [{task.title}]? <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteItemDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
