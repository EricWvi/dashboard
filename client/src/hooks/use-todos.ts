import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  collectionId: number;
  difficulty: number;
};

export function useTodos(collectionId: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["/api/collection", collectionId],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/todo?Action=ListTodos", {
        collectionId,
      });
      const data = await response.json();
      const ids = (data.message.todos as Todo[]).map((todo) => {
        queryClient.setQueryData(["/api/todo", todo.id], todo);
        return todo.id;
      });
      return ids;
    },
  });
}

export function useTodo(id: number) {
  return useQuery<Todo>({
    queryKey: ["/api/todo", id],
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
        queryKey: ["/api/collection", variables.collectionId],
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
        queryKey: ["/api/collection", collectionId],
      });
    },
  });
}
