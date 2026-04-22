import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import keys from "./query-keys";
import { queryClient } from "@/lib/queryClient";
import { todayStart, ZERO_UUID } from "@/lib/utils";
import type { CollectionField, TodoField } from "@/lib/dashboard/model";

export function useTodos(collectionId: string) {
  return useQuery({
    queryKey: keys.todos.inCollection(collectionId),
    queryFn: async () => {
      const todos = await dashboardDatabase.getTodos(collectionId);
      const ids = todos
        .sort((a, b) => b.order - a.order)
        .map((todo) => todo.id);
      return ids;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useToday() {
  return useQuery({
    queryKey: keys.todos.today(),
    queryFn: async () => {
      return dashboardDatabase.getTodayTodos();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function removeTodayQuery() {
  queryClient.removeQueries({ queryKey: keys.todos.today() });
}

export function useCompleted(collectionId: string) {
  return useQuery({
    queryKey: keys.todos.completedInCollection(collectionId),
    queryFn: async () => {
      const todos = await dashboardDatabase.getCompletedTodos(collectionId);
      const ids = todos
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((todo) => todo.id);
      return ids;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useTodo(id: string) {
  return useQuery({
    enabled: !!id,
    queryKey: keys.todos.detail(id),
    queryFn: async () => {
      return dashboardDatabase.getTodo(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateTodo() {
  return useMutation({
    mutationFn: async (data: { title: string; collectionId: string }) => {
      const todos = await dashboardDatabase.getTodos(data.collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.addTodo({
        title: data.title,
        completed: false,
        collectionId: data.collectionId,
        difficulty: 0,
        order: maxOrder + 1,
        link: "",
        draft: ZERO_UUID,
        schedule: null,
        done: false,
        count: 0,
        kanban: ZERO_UUID,
      });
    },
  });
}

export function useUpdateTodo() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TodoField>;
    }) => {
      return dashboardDatabase.updateTodo(id, data);
    },
  });
}

export function useTopTodo() {
  return useMutation({
    mutationFn: async (data: { id: string; collectionId: string }) => {
      const todos = await dashboardDatabase.getTodos(data.collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(data.id, {
        order: maxOrder + 1,
      });
    },
  });
}

export function useBottomTodo() {
  return useMutation({
    mutationFn: async (data: { id: string; collectionId: string }) => {
      const todos = await dashboardDatabase.getTodos(data.collectionId);
      const minOrder = todos.reduce(
        (min, todo) => Math.min(min, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(data.id, {
        order: Math.min(minOrder - 1, -1),
      });
    },
  });
}

export function useUpdateSchedule() {
  return useMutation({
    mutationFn: async (data: { id: string; schedule: number }) => {
      await dashboardDatabase.updateTodo(data.id, {
        schedule: data.schedule,
      });
    },
  });
}

export function useUnsetLink() {
  return useMutation({
    mutationFn: async (data: { id: string }) => {
      await dashboardDatabase.updateTodo(data.id, {
        link: "",
      });
    },
  });
}

export function useCompleteTodo() {
  return useMutation({
    mutationFn: async (data: { id: string }) => {
      await dashboardDatabase.updateTodo(data.id, {
        createdAt: Date.now(),
        completed: true,
      });
    },
  });
}

export function useDoneTodo() {
  return useMutation({
    mutationFn: async (data: { id: string }) => {
      const todo = await dashboardDatabase.getTodo(data.id);
      await dashboardDatabase.updateTodo(data.id, {
        done: true,
        count: (todo?.count ?? 0) + 1,
      });
    },
  });
}

export function useUndoneTodo() {
  return useMutation({
    mutationFn: async (data: { id: string }) => {
      const todo = await dashboardDatabase.getTodo(data.id);
      await dashboardDatabase.updateTodo(data.id, {
        done: false,
        count: Math.max((todo?.count ?? 1) - 1, 0),
      });
    },
  });
}

export function useRestoreTodo() {
  return useMutation({
    mutationFn: async (data: { id: string; collectionId: string }) => {
      const todos = await dashboardDatabase.getTodos(data.collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(data.id, {
        completed: false,
        order: maxOrder + 1,
      });
    },
  });
}

export function useMoveTodo() {
  return useMutation({
    mutationFn: async ({ id, dst }: { id: string; dst: string }) => {
      await dashboardDatabase.updateTodo(id, {
        collectionId: dst,
      });
    },
  });
}

export function useDeleteTodo() {
  return useMutation({
    mutationFn: async (id: string) => {
      await dashboardDatabase.softDeleteTodo(id);
    },
  });
}

export function useClearTodos(collectionId: string) {
  return useMutation({
    mutationFn: async () => {
      const todos = await dashboardDatabase.getCompletedTodos(collectionId);
      await Promise.all(
        todos.map((todo) => dashboardDatabase.softDeleteTodo(todo.id)),
      );
    },
  });
}

export async function listAllTodos() {
  return dashboardDatabase.listAllTodos();
}

export function usePlanToday() {
  return useMutation({
    mutationFn: async (data: { ids: string[] }) => {
      await Promise.all(
        data.ids.map((id) =>
          dashboardDatabase.updateTodo(id, {
            done: false,
            schedule: todayStart(),
          }),
        ),
      );
    },
  });
}

const inbox = {
  id: ZERO_UUID,
  name: "📥 Inbox",
};

export function useCollections() {
  return useQuery({
    queryKey: keys.collections.all,
    queryFn: async () => {
      const collections = await dashboardDatabase.getCollections();
      return [inbox, ...collections];
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: keys.collections.detail(id),
    queryFn: async () => {
      if (id === ZERO_UUID) {
        return inbox;
      }
      return dashboardDatabase.getCollection(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateCollection() {
  return useMutation({
    mutationFn: async (data: CollectionField) => {
      return dashboardDatabase.addCollection(data);
    },
  });
}

export function useUpdateCollection() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CollectionField>;
    }) => {
      return dashboardDatabase.updateCollection(id, data);
    },
  });
}

export function useDeleteCollection() {
  return useMutation({
    mutationFn: async (id: string) => {
      return dashboardDatabase.softDeleteCollection(id);
    },
  });
}
