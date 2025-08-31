import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest } from "@/lib/queryClient";
import { CollectionsQuery } from "@/hooks/use-todos";
import { dateString } from "@/lib/utils";

export type Watch = {
  id: number;
  title: string;
  type: WatchType;
  status: WatchStatus;
  year: number;
  rate: number;
  createdAt: Date;
  payload: Payload;
  author: string;
};

export interface Payload {
  img?: string;
  link?: string;
  range?: number;
  measure?: string;
  progress?: number;
  epoch?: number;
  checkpoints?: [string, number][];
  review?: number;
  quotes?: number;
}

export type WatchType =
  | "Movie"
  | "Series"
  | "Documentary"
  | "Book"
  | "Game"
  | "Manga";
export const WatchEnum: {
  MOVIE: WatchType;
  SERIES: WatchType;
  DOCUMENTARY: WatchType;
  BOOK: WatchType;
  GAME: WatchType;
  MANGA: WatchType;
} = {
  MOVIE: "Movie",
  SERIES: "Series",
  DOCUMENTARY: "Documentary",
  BOOK: "Book",
  GAME: "Game",
  MANGA: "Manga",
};

export type WatchStatus =
  | "Watching"
  | "Completed"
  | "Dropped"
  | "Plan to Watch";
export const WatchStatus: {
  WATCHING: WatchStatus;
  COMPLETED: WatchStatus;
  DROPPED: WatchStatus;
  PLAN_TO_WATCH: WatchStatus;
} = {
  WATCHING: "Watching",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PLAN_TO_WATCH: "Plan to Watch",
};

export const Rating = {
  Five: "Five Stars",
  Four: "Four Stars",
  Three: "Three Stars",
  Two: "Two Stars",
  One: "One Star",
  Zero: "Zero Star",
};

export type WatchMeasure =
  | "Chapter"
  | "Episode"
  | "Minute"
  | "Page"
  | "Percentage"
  | "Trophy"
  | "Volume";
export const WatchMeasure: {
  CHAPTER: WatchMeasure;
  EPISODE: WatchMeasure;
  MINUTE: WatchMeasure;
  PAGE: WatchMeasure;
  PERCENTAGE: WatchMeasure;
  TROPHY: WatchMeasure;
  VOLUME: WatchMeasure;
} = {
  CHAPTER: "Chapter",
  EPISODE: "Episode",
  MINUTE: "Minute",
  PAGE: "Page",
  PERCENTAGE: "Percentage",
  TROPHY: "Trophy",
  VOLUME: "Volume",
};

const keyWatchesOfStatus = (status: WatchStatus) => ["/api/watches", status];

export function useWatches(status: WatchStatus) {
  return useQuery({
    queryKey: keyWatchesOfStatus(status),
    queryFn: async () => {
      const response = await getRequest(
        "/api/watch?Action=ListWatches&status=" + status,
      );
      const data = await response.json();
      return data.message.watches as Watch[];
    },
  });
}

export function useCreateWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Watch, "id">) => {
      const response = await postRequest("/api/watch?Action=CreateWatch", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.COMPLETED),
      });
    },
  });
}

export function useCreateToWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Watch>) => {
      const response = await postRequest("/api/watch?Action=CreateWatch", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.PLAN_TO_WATCH),
      });
    },
  });
}

export function useDeleteWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; status: WatchStatus }) => {
      const response = await postRequest("/api/watch?Action=DeleteWatch", {
        id: data.id,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(variables.status),
      });
    },
  });
}

export function useUpdateWatch(status: WatchStatus) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Watch>) => {
      const response = await postRequest("/api/watch?Action=UpdateWatch", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(status),
      });
    },
  });
}

export function useStartWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: number;
      payload: Payload;
      title: string;
      type: WatchType;
      link: string;
    }) => {
      const response = await postRequest("/api/watch?Action=UpdateWatch", {
        id: data.id,
        status: WatchStatus.WATCHING,
        payload: data.payload,
        createdAt: new Date(),
      });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.PLAN_TO_WATCH),
      });
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.WATCHING),
      });
      const collections = await queryClient.fetchQuery(CollectionsQuery);
      const collection = collections.find((collection) =>
        collection.name.includes("娱乐"),
      );
      if (collection) {
        postRequest("/api/todo?Action=CreateTodo", {
          title: variables.type + ": " + variables.title,
          link: variables.link,
          collectionId: collection.id,
        });
      }
    },
  });
}

export function useCompleteWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; rate: number }) => {
      const response = await postRequest("/api/watch?Action=UpdateWatch", {
        id: data.id,
        status: WatchStatus.COMPLETED,
        rate: data.rate,
        createdAt: new Date(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.COMPLETED),
      });
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.WATCHING),
      });
    },
  });
}

export function useRecoverWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Watch) => {
      const response = await postRequest("/api/watch?Action=UpdateWatch", {
        id: data.id,
        status: WatchStatus.PLAN_TO_WATCH,
        createdAt: new Date(),
        payload: {
          ...data.payload,
          progress: 0,
          checkpoints: [
            ...(data.payload.checkpoints ?? []),
            [dateString(new Date(), "-"), 0],
          ],
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.DROPPED),
      });
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.PLAN_TO_WATCH),
      });
    },
  });
}
