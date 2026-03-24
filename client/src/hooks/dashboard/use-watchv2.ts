import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import keys from "./query-keys";
import {
  WatchStatus,
  WatchTypeText,
  type Watch,
  type WatchField,
  type WatchPayload,
  type WatchType,
} from "@/lib/dashboard/model";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export function useWatches(status: WatchStatus) {
  return useQuery({
    queryKey: keys.watches.ofStatus(status),
    queryFn: async () => {
      return dashboardDatabase.getWatches(status);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateWatch() {
  return useMutation({
    mutationFn: async (data: WatchField) => {
      return dashboardDatabase.addWatch(data);
    },
  });
}

export function useDeleteWatch() {
  return useMutation({
    mutationFn: async (id: string) => {
      return dashboardDatabase.softDeleteWatch(id);
    },
  });
}

export function useUpdateWatch() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<WatchField>;
    }) => {
      return dashboardDatabase.updateWatch(id, data);
    },
  });
}

export function useStartWatch() {
  return useMutation({
    mutationFn: async (data: {
      id: string;
      payload: WatchPayload;
      title: string;
      type: WatchType;
      link: string;
    }) => {
      const user = await dashboardDatabase.getUser();
      await dashboardDatabase.updateWatch(data.id, {
        status: WatchStatus.WATCHING,
        payload: data.payload,
        createdAt: new Date().getTime(),
      });

      const todos = await dashboardDatabase.getTodos(ZERO_UUID);
      const maxOrder = todos.reduce(
        (max, todo) => Math.max(max, todo.order),
        0,
      );
      await dashboardDatabase.addTodo({
        title: `${WatchTypeText[data.type][user!.language]}: ${data.title}`,
        completed: false,
        collectionId: ZERO_UUID,
        difficulty: 0,
        order: maxOrder + 1,
        link: data.link,
        draft: ZERO_UUID,
        schedule: null,
        done: false,
        count: 0,
        kanban: ZERO_UUID,
      });
    },
  });
}

export function useCompleteWatch() {
  return useMutation({
    mutationFn: async (data: { id: string; rate: number }) => {
      await dashboardDatabase.updateWatch(data.id, {
        status: WatchStatus.COMPLETED,
        rate: data.rate,
        createdAt: new Date().getTime(),
      });
    },
  });
}

export function useRecoverWatch() {
  return useMutation({
    mutationFn: async (data: Watch) => {
      await dashboardDatabase.updateWatch(data.id, {
        status: WatchStatus.PLAN_TO_WATCH,
        payload: {
          ...data.payload,
          progress: 0,
        },
        createdAt: new Date().getTime(),
      });
    },
  });
}
