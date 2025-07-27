import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  collectionId: number;
  difficulty: number;
  link: string;
  draft: number;
  schedule: Date | null;
};

const keyTodosOfCollection = (collectionId: number) => [
  "/api/todos",
  collectionId,
];
const keyTodo = (id: number) => ["/api/todo", id];
const keyAllCollection = () => ["/api/collections"];
const keyCollection = (id: number) => ["/api/collection", id];

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
    mutationFn: async (data: Omit<Todo, "id">) => {
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
        queryKey: keyTodo(variables.id),
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

export function useDeleteTodo(collectionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", "/api/todo?Action=DeleteTodo", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyTodosOfCollection(collectionId),
      });
    },
  });
}

export type Collection = {
  id: number;
  name: string;
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
      return data.message.collections as Collection[];
    },
  });
}

export function useCollection(id: number) {
  return useQuery<Collection>({
    queryKey: keyCollection(id),
    queryFn: async () => {
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyCollection(variables.id),
      });
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
