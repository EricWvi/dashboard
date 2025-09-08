import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest } from "@/lib/queryClient";
import { CollectionsQuery } from "@/hooks/use-todos";
import { UserLangEnum, type I18nText } from "./use-user";

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

export const WatchTypeText: {
  [WatchEnum.MOVIE]: I18nText;
  [WatchEnum.SERIES]: I18nText;
  [WatchEnum.DOCUMENTARY]: I18nText;
  [WatchEnum.BOOK]: I18nText;
  [WatchEnum.GAME]: I18nText;
  [WatchEnum.MANGA]: I18nText;
} = {
  [WatchEnum.MOVIE]: {
    [UserLangEnum.ZHCN]: "电影",
    [UserLangEnum.ENUS]: "Movie",
  },
  [WatchEnum.SERIES]: {
    [UserLangEnum.ZHCN]: "剧集",
    [UserLangEnum.ENUS]: "Series",
  },
  [WatchEnum.DOCUMENTARY]: {
    [UserLangEnum.ZHCN]: "纪录片",
    [UserLangEnum.ENUS]: "Documentary",
  },
  [WatchEnum.BOOK]: {
    [UserLangEnum.ZHCN]: "书籍",
    [UserLangEnum.ENUS]: "Book",
  },
  [WatchEnum.GAME]: {
    [UserLangEnum.ZHCN]: "游戏",
    [UserLangEnum.ENUS]: "Game",
  },
  [WatchEnum.MANGA]: {
    [UserLangEnum.ZHCN]: "漫画",
    [UserLangEnum.ENUS]: "Manga",
  },
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

export const RatingText = {
  [Rating.Five]: {
    [UserLangEnum.ZHCN]: "五星",
    [UserLangEnum.ENUS]: "Five Stars",
  },
  [Rating.Four]: {
    [UserLangEnum.ZHCN]: "四星",
    [UserLangEnum.ENUS]: "Four Stars",
  },
  [Rating.Three]: {
    [UserLangEnum.ZHCN]: "三星",
    [UserLangEnum.ENUS]: "Three Stars",
  },
  [Rating.Two]: {
    [UserLangEnum.ZHCN]: "二星",
    [UserLangEnum.ENUS]: "Two Stars",
  },
  [Rating.One]: {
    [UserLangEnum.ZHCN]: "一星",
    [UserLangEnum.ENUS]: "One Star",
  },
  [Rating.Zero]: {
    [UserLangEnum.ZHCN]: "零星",
    [UserLangEnum.ENUS]: "Zero Star",
  },
};

export type WatchMeasure =
  | "Chapter"
  | "Episode"
  | "Minute"
  | "Page"
  | "Percentage"
  | "Trophy"
  | "Volume";
export const WatchMeasureEnum: {
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

export const WatchMeasureText: {
  [WatchMeasureEnum.CHAPTER]: I18nText;
  [WatchMeasureEnum.EPISODE]: I18nText;
  [WatchMeasureEnum.MINUTE]: I18nText;
  [WatchMeasureEnum.PAGE]: I18nText;
  [WatchMeasureEnum.PERCENTAGE]: I18nText;
  [WatchMeasureEnum.TROPHY]: I18nText;
  [WatchMeasureEnum.VOLUME]: I18nText;
} = {
  [WatchMeasureEnum.CHAPTER]: {
    [UserLangEnum.ZHCN]: "章",
    [UserLangEnum.ENUS]: "Chapter",
  },
  [WatchMeasureEnum.EPISODE]: {
    [UserLangEnum.ZHCN]: "集",
    [UserLangEnum.ENUS]: "Episode",
  },
  [WatchMeasureEnum.MINUTE]: {
    [UserLangEnum.ZHCN]: "分钟",
    [UserLangEnum.ENUS]: "Minute",
  },
  [WatchMeasureEnum.PAGE]: {
    [UserLangEnum.ZHCN]: "页",
    [UserLangEnum.ENUS]: "Page",
  },
  [WatchMeasureEnum.PERCENTAGE]: {
    [UserLangEnum.ZHCN]: "百分比",
    [UserLangEnum.ENUS]: "Percentage",
  },
  [WatchMeasureEnum.TROPHY]: {
    [UserLangEnum.ZHCN]: "奖杯",
    [UserLangEnum.ENUS]: "Trophy",
  },
  [WatchMeasureEnum.VOLUME]: {
    [UserLangEnum.ZHCN]: "卷",
    [UserLangEnum.ENUS]: "Volume",
  },
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

export function useUpdateWatch(status: WatchStatus[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Watch>) => {
      const response = await postRequest("/api/watch?Action=UpdateWatch", {
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      status.map((s) => {
        queryClient.invalidateQueries({
          queryKey: keyWatchesOfStatus(s),
        });
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
