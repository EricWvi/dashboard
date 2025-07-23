"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CheckCircle2 } from "lucide-react";

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
}

export default function Todo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (newTask.trim() !== "") {
      const task: Task = {
        id: Date.now(),
        text: newTask.trim(),
        completed: false,
        createdAt: new Date(),
      };
      setTasks([...tasks, task]);
      setNewTask("");
    }
  };

  const toggleTask = (id: number) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter((task) => !task.completed));
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card className="gap-2">
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add new task */}
          <div className="flex gap-2 space-y-4">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addTask();
                }
              }}
              className="flex-1"
            />
            <Button onClick={addTask} size="icon">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add task</span>
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
            {tasks.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                All Done!
              </div>
            ) : (
              tasks.map((task) => (
                <Card
                  key={task.id}
                  className={`py-2 transition-all ${task.completed ? "opacity-75" : ""}`}
                >
                  <CardContent className="flex items-center gap-3">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`task-${task.id}`}
                        className={`block cursor-pointer ${
                          task.completed
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }`}
                      >
                        {task.text}
                      </label>
                    </div>
                    {task.completed && (
                      <Badge variant="secondary" className="text-xs">
                        Done
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete task</span>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
