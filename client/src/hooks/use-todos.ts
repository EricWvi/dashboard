import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  order: number;
  done: boolean;
  count: number;
  collectionId: number;
  difficulty: number;
  link: string;
  draft: number;
  kanban: number;
  schedule: Date | undefined | null;
  createdAt: Date;
};

const keyTodosOfCollection = (collectionId: number) => [
  "/api/todos",
  collectionId,
];
const keyCompletedOfCollection = (collectionId: number) => [
  "/api/completed",
  collectionId,
];
const keyTodo = (id: number) => ["/api/todo", id];
const keyAllCollection = () => ["/api/collections"];
const keyCollection = (id: number) => ["/api/collection", id];
const keyTodayTodo = () => ["/api/today"];

export function useTodos(collectionId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: keyTodosOfCollection(collectionId),
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/todo?Action=ListTodos", {
        collectionId,
      });
      const data = await response.json();
      const ids = (data.message.todos as Todo[]).map((todo) => {
        queryClient.setQueryData(keyTodo(todo.id), todo);
        return todo.id;
      });
      return ids;
    },
  });
}

export function useToday() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: keyTodayTodo(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/collection?Action=ListToday",
        {},
      );
      const data = await response.json();
      (data.message.todos as Todo[]).forEach((todo) =>
        queryClient.setQueryData(keyTodo(todo.id), todo),
      );
      return data.message.todos as Todo[];
    },
  });
}

export function useCompleted(collectionId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: keyCompletedOfCollection(collectionId),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/todo?Action=ListCompleted",
        {
          collectionId,
        },
      );
      const data = await response.json();
      const ids = (data.message.todos as Todo[]).map((todo) => {
        queryClient.setQueryData(keyTodo(todo.id), todo);
        return todo.id;
      });
      return ids;
    },
  });
}

export function useTodo(id: number) {
  return useQuery<Todo>({
    queryKey: keyTodo(id),
    enabled: !!id,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/todo?Action=GetTodo", {
        id,
      });
      const data = await response.json();
      return data.message as Todo;
    },
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; collectionId: number }) => {
      const response = await apiRequest("POST", "/api/todo?Action=CreateTodo", {
        ...data,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.collectionId),
      });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Todo>) => {
      await apiRequest("POST", "/api/todo?Action=UpdateTodo", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodo(variables.id),
      });
    },
  });
}

export function useTopTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; collectionId: number }) => {
      await apiRequest("POST", "/api/todo?Action=TopTodo", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.collectionId),
      });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; schedule: Date }) => {
      await apiRequest("POST", "/api/todo?Action=UpdateSchedule", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodo(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: keyTodayTodo(),
      });
    },
  });
}

export function useUnsetLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      await apiRequest("POST", "/api/todo?Action=UnsetLink", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodo(variables.id),
      });
    },
  });
}

export function useCompleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; collectionId: number }) => {
      await apiRequest("POST", "/api/todo?Action=CompleteTodo", {
        id: data.id,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: keyCompletedOfCollection(variables.collectionId),
      });
    },
  });
}

export function useDoneTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      await apiRequest("POST", "/api/todo?Action=DoneTodo", {
        id: data.id,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodo(variables.id),
      });
    },
  });
}

export function useUndoneTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      await apiRequest("POST", "/api/todo?Action=UndoneTodo", {
        id: data.id,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodo(variables.id),
      });
    },
  });
}

export function useRestoreTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; collectionId: number }) => {
      await apiRequest("POST", "/api/todo?Action=RestoreTodo", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: keyCompletedOfCollection(variables.collectionId),
      });
    },
  });
}

export function useMoveTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      dst,
    }: {
      id: number;
      src: number;
      dst: number;
    }) => {
      await apiRequest("POST", "/api/todo?Action=MoveTodo", {
        id,
        dst,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyTodayTodo(),
      });
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.src),
      });
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(variables.dst),
      });
    },
  });
}

export function useDeleteTodo(collectionId: number, completed = false) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", "/api/todo?Action=DeleteTodo", { id });
    },
    onSuccess: () => {
      if (completed) {
        queryClient.invalidateQueries({
          queryKey: keyCompletedOfCollection(collectionId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: keyTodosOfCollection(collectionId),
        });
      }
    },
  });
}

export async function listAllTodos() {
  const response = await apiRequest(
    "POST",
    "/api/collection?Action=ListAll",
    {},
  );
  const data = await response.json();
  return data.message.todos as Todo[];
}

export function usePlanToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ids: number[] }) => {
      await apiRequest("POST", "/api/collection?Action=PlanToday", { ...data });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keyTodayTodo() });
      variables.ids.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: keyTodo(id) });
      });
    },
  });
}

export type Collection = {
  id: number;
  name: string;
};

const inbox = {
  id: 0,
  name: "📥 Inbox",
};

export function useCollections() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: keyAllCollection(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/collection?Action=ListCollections",
        {},
      );
      const data = await response.json();
      (data.message.collections as Collection[]).map((collection) => {
        queryClient.setQueryData(keyCollection(collection.id), collection);
      });
      return [inbox, ...data.message.collections] as Collection[];
    },
  });
}

export function useCollection(id: number) {
  return useQuery<Collection>({
    queryKey: keyCollection(id),
    queryFn: async () => {
      if (id === 0) {
        return inbox;
      }
      const response = await apiRequest(
        "POST",
        "/api/collection?Action=GetCollection",
        {
          id,
        },
      );
      const data = await response.json();
      return data.message as Collection;
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Collection, "id">) => {
      await apiRequest("POST", "/api/collection?Action=CreateCollection", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyAllCollection(),
      });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Collection>) => {
      await apiRequest("POST", "/api/collection?Action=UpdateCollection", {
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyAllCollection() });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", "/api/collection?Action=DeleteCollection", {
        id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyAllCollection(),
      });
    },
  });
}
