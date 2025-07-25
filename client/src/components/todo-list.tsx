import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, MoreVertical, Edit } from "lucide-react";
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
import {
  type Todo,
  useCollection,
  useCreateTodo,
  useDeleteCollection,
  useDeleteTodo,
  useTodo,
  useTodos,
  useUpdateCollection,
} from "@/hooks/use-todos";

const Todo = ({ id, collectionId }: { id: number; collectionId: number }) => {
  const { data: todo, isLoading } = useTodo(id);
  const deleteTodoMutation = useDeleteTodo(collectionId);
  const deleteTodo = async () => {
    await deleteTodoMutation.mutateAsync(id);
  };

  return (
    !isLoading &&
    todo && (
      <Card
        key={todo.id}
        className={`py-2 transition-all ${todo.completed ? "opacity-75" : ""}`}
      >
        <CardContent className="flex items-center gap-3">
          <Checkbox
            id={`task-${todo.id}`}
            checked={todo.completed}
            // onCheckedChange={() => toggleTask(todo.id)}
          />
          <div className="min-w-0 flex-1">
            <label
              htmlFor={`task-${todo.id}`}
              className={`block cursor-pointer ${
                todo.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {todo.title}
            </label>
          </div>
          {todo.completed && (
            <Badge variant="secondary" className="text-xs">
              Done
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteTodo}
            className="text-muted-foreground hover:text-destructive h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete task</span>
          </Button>
        </CardContent>
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

  //   const toggleTask = (id: number) => {
  //     setTasks(
  //       tasks.map((task) =>
  //         task.id === id ? { ...task, completed: !task.completed } : task,
  //       ),
  //     );
  //   };

  //   const deleteTask = (id: number) => {
  //     setTasks(tasks.filter((task) => task.id !== id));
  //   };

  //   const clearCompleted = () => {
  //     setTasks(tasks.filter((task) => !task.completed));
  //   };

  //   const completedCount = tasks.filter((task) => task.completed).length;
  //   const totalCount = tasks.length;

  return (
    <>
      {!isLoading && !isCloading && todos && collection && (
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
                    <Edit className="mr-2 h-4 w-4" />
                    Rename List
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteListDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
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
            <div className="h-96 space-y-2 overflow-y-auto sm:h-58">
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
      )}
    </>
  );
};

export default TodoList;
