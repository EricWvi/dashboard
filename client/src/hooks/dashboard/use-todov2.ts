import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import keys from "./query-keys";
import { queryClient } from "@/lib/queryClient";
import { todayStart } from "@/lib/utils";
import type { Collection, CollectionField, Todo, TodoField } from "@/lib/dashboard/model";
export type { Todo, Collection } from "@/lib/dashboard/model";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const normalizeId = (id: string | number) => String(id);
const normalizeCollectionId = (id: string | number) =>
  id === 0 || id === "0" ? ZERO_UUID : String(id);

export function useTodos(collectionId: string | number) {
  const normalizedCollectionId = normalizeCollectionId(collectionId);
  return useQuery({
    queryKey: keys.todos.inCollection(normalizedCollectionId),
    queryFn: async () => {
      const todos = await dashboardDatabase.getTodos(normalizedCollectionId);
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

export function useCompleted(collectionId: string | number) {
  const normalizedCollectionId = normalizeCollectionId(collectionId);
  return useQuery({
    queryKey: keys.todos.completedInCollection(normalizedCollectionId),
    queryFn: async () => {
      const todos = await dashboardDatabase.getCompletedTodos(normalizedCollectionId);
      const ids = todos
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((todo) => todo.id);
      return ids;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useTodo(id: string | number) {
  const normalizedId = normalizeId(id);
  return useQuery({
    enabled: !!normalizedId,
    queryKey: keys.todos.detail(normalizedId),
    queryFn: async () => {
      return dashboardDatabase.getTodo(normalizedId);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateTodo() {
  return useMutation({
    mutationFn: async (data: { title: string; collectionId: string | number }) => {
      const collectionId = normalizeCollectionId(data.collectionId);
      const todos = await dashboardDatabase.getTodos(collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.addTodo({
        title: data.title,
        completed: false,
        collectionId,
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
    mutationFn: async (
      params:
        | { id: string | number; data: Partial<TodoField> }
        | ({ id: string | number } & Partial<TodoField>),
    ) => {
      const { id } = params;
      const data =
        "data" in params ? params.data : (({ id, ...rest }) => rest)(params);
      return dashboardDatabase.updateTodo(normalizeId(id), data);
    },
  });
}

export function useTopTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number; collectionId: string | number }) => {
      const collectionId = normalizeCollectionId(data.collectionId);
      const todos = await dashboardDatabase.getTodos(collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        order: maxOrder + 1,
      });
    },
  });
}

export function useBottomTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number; collectionId: string | number }) => {
      const collectionId = normalizeCollectionId(data.collectionId);
      const todos = await dashboardDatabase.getTodos(collectionId);
      const minOrder = todos.reduce(
        (min, todo) => Math.min(min, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        order: Math.min(minOrder - 1, -1),
      });
    },
  });
}

export function useUpdateSchedule() {
  return useMutation({
    mutationFn: async (data: { id: string | number; schedule: Date }) => {
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        schedule: data.schedule.getTime(),
      });
    },
  });
}

export function useUnsetLink() {
  return useMutation({
    mutationFn: async (data: { id: string | number }) => {
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        link: "",
      });
    },
  });
}

export function useCompleteTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number; collectionId?: string | number }) => {
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        createdAt: Date.now(),
        completed: true,
      });
    },
  });
}

export function useDoneTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number }) => {
      const todo = await dashboardDatabase.getTodo(normalizeId(data.id));
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        done: true,
        count: (todo?.count ?? 0) + 1,
      });
    },
  });
}

export function useUndoneTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number }) => {
      const todo = await dashboardDatabase.getTodo(normalizeId(data.id));
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        done: false,
        count: Math.max((todo?.count ?? 1) - 1, 0),
      });
    },
  });
}

export function useRestoreTodo() {
  return useMutation({
    mutationFn: async (data: { id: string | number; collectionId: string | number }) => {
      const collectionId = normalizeCollectionId(data.collectionId);
      const todos = await dashboardDatabase.getTodos(collectionId);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.updateTodo(normalizeId(data.id), {
        completed: false,
        order: maxOrder + 1,
      });
    },
  });
}

export function useMoveTodo() {
  return useMutation({
    mutationFn: async ({ id, dst }: { id: string | number; dst: string | number }) => {
      await dashboardDatabase.updateTodo(normalizeId(id), {
        collectionId: normalizeCollectionId(dst),
      });
    },
  });
}

export function useDeleteTodo(_collectionId?: string | number, _completed = false) {
  return useMutation({
    mutationFn: async (data: string | number | { id: string | number }) => {
      const id = typeof data === "object" ? data.id : data;
      await dashboardDatabase.softDeleteTodo(normalizeId(id));
    },
  });
}

export function useClearTodos(collectionId: string | number) {
  const normalizedCollectionId = normalizeCollectionId(collectionId);
  return useMutation({
    mutationFn: async () => {
      const todos = await dashboardDatabase.getCompletedTodos(normalizedCollectionId);
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
    mutationFn: async (data: { ids: Array<string | number> }) => {
      await Promise.all(
        data.ids.map((id) =>
          dashboardDatabase.updateTodo(normalizeId(id), {
            done: false,
            schedule: todayStart().getTime(),
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

export function useCollection(id: string | number) {
  const normalizedCollectionId = normalizeCollectionId(id);
  return useQuery({
    queryKey: keys.collections.detail(normalizedCollectionId),
    queryFn: async () => {
      if (normalizedCollectionId === ZERO_UUID) {
        return inbox;
      }
      return dashboardDatabase.getCollection(normalizedCollectionId);
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
    mutationFn: async (
      params:
        | { id: string | number; data: Partial<CollectionField> }
        | ({ id: string | number } & Partial<CollectionField>),
    ) => {
      const { id } = params;
      const data =
        "data" in params ? params.data : (({ id, ...rest }) => rest)(params);
      return dashboardDatabase.updateCollection(normalizeId(id), data);
    },
  });
}

export function useDeleteCollection() {
  return useMutation({
    mutationFn: async (id: string | number) => {
      return dashboardDatabase.softDeleteCollection(normalizeId(id));
    },
  });
}
