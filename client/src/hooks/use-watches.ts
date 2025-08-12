import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Watch = {
  id: number;
  title: string;
  type: WatchType;
  status: WatchStatus;
  year: number;
  rate: number;
  createdAt: Date;
  payload: any;
};

export type WatchType =
  | "Movie"
  | "Series"
  | "Documentary"
  | "Book"
  | "Game"
  | "Manga";
export const WatchType: {
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

const keyWatch = (id: number) => ["/api/watch", id];
const keyWatchesOfStatus = (status: WatchStatus) => ["/api/watches", status];

export function useWatches(status: WatchStatus) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: keyWatchesOfStatus(status),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=ListWatches",
        {
          status,
        },
      );
      const data = await response.json();
      (data.message.watches as Watch[]).forEach((watch) => {
        queryClient.setQueryData(keyWatch(watch.id), watch);
      });
      return data.message.watches as Watch[];
    },
  });
}

export function useWatch(id: number) {
  return useQuery<Watch>({
    queryKey: keyWatch(id),
    enabled: !!id,
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/watch?Action=GetWatch", {
        id,
      });
      const data = await response.json();
      return data.message as Watch;
    },
  });
}

export function useCreateWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Watch, "id">) => {
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=CreateWatch",
        {
          ...data,
        },
      );
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
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=CreateWatch",
        {
          ...data,
        },
      );
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
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=DeleteWatch",
        {
          id: data.id,
        },
      );
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
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=UpdateWatch",
        {
          ...data,
        },
      );
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
    mutationFn: async (data: { id: number; payload: any }) => {
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=UpdateWatch",
        {
          id: data.id,
          status: WatchStatus.WATCHING,
          payload: data.payload,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.PLAN_TO_WATCH),
      });
      queryClient.invalidateQueries({
        queryKey: keyWatchesOfStatus(WatchStatus.WATCHING),
      });
    },
  });
}

export function useCompleteWatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; rate: number }) => {
      const response = await apiRequest(
        "POST",
        "/api/watch?Action=UpdateWatch",
        {
          id: data.id,
          status: WatchStatus.COMPLETED,
          rate: data.rate,
          createdAt: new Date(),
        },
      );
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
