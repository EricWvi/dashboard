import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import keys from "./query-keys";
import {
  Rating,
  RatingText,
  WatchEnum,
  WatchMeasureEnum,
  WatchMeasureText,
  WatchStatus,
  WatchTypeText,
  type Watch,
  type WatchField,
  type WatchMeasure,
  type WatchPayload,
  type WatchType,
} from "@/lib/dashboard/model";
export {
  Rating,
  RatingText,
  WatchEnum,
  WatchMeasureEnum,
  WatchMeasureText,
  WatchStatus,
  WatchTypeText,
  type Watch,
  type WatchMeasure,
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
    mutationFn: async (data: Partial<WatchField>) => {
      return dashboardDatabase.addWatch({
        type: data.type ?? WatchEnum.MOVIE,
        title: data.title ?? "",
        status: data.status ?? WatchStatus.PLAN_TO_WATCH,
        year: data.year ?? new Date().getFullYear(),
        rate: data.rate ?? 0,
        payload: data.payload ?? {},
        author: data.author ?? "",
      });
    },
  });
}

export function useDeleteWatch() {
  return useMutation({
    mutationFn: async (data: string | number | { id: string | number }) => {
      const id = typeof data === "object" ? data.id : data;
      return dashboardDatabase.softDeleteWatch(String(id));
    },
  });
}

export function useUpdateWatch(_status?: WatchStatus[]) {
  return useMutation({
    mutationFn: async (
      params:
        | { id: string | number; data: Partial<WatchField> }
        | ({ id: string | number } & Partial<WatchField>),
    ) => {
      const { id } = params;
      const payload = "data" in params ? params.data : (({ id, ...rest }) => rest)(params);
      return dashboardDatabase.updateWatch(String(id), payload);
    },
  });
}

export const useCreateToWatch = useCreateWatch;
export const useCreateWatched = useCreateWatch;

export function useStartWatch() {
  return useMutation({
    mutationFn: async (data: {
      id: string | number;
      payload: WatchPayload;
      title: string;
      type: WatchType;
      link: string;
    }) => {
      const user = await dashboardDatabase.getUser();
      await dashboardDatabase.updateWatch(String(data.id), {
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
    mutationFn: async (data: { id: string | number; rate: number }) => {
      await dashboardDatabase.updateWatch(String(data.id), {
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
