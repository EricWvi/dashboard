import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import {
  type Todo,
  useCreateTodo,
  useDeleteTodo,
  useTodo,
  useTodos,
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

const TodoList = ({ collectionId = 0 }: { collectionId?: number }) => {
  const { data: todos, isLoading } = useTodos(collectionId);
  const createTodoMutation = useCreateTodo();
  const [newTodo, setNewTodo] = useState("");

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
      {!isLoading && todos && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle>📥 Inbox</CardTitle>
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
                disabled={createTodoMutation.isPending}
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
            <div className="space-y-2">
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
        </Card>
      )}
    </>
  );
};

export default TodoList;
