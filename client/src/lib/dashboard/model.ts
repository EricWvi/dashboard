import type { MetaField, Tag, TiptapV2, User } from "@/lib/model";
import { UserLangEnum, type I18nText } from "@/lib/model";

export const SchemaVersion = 1;

export interface TodoField {
  title: string;
  completed: boolean;
  collectionId: string; // UUID
  difficulty: number;
  order: number;
  link: string;
  draft: string; // UUID
  schedule: number | null; // timestamp
  done: boolean;
  count: number;
  kanban: string; // UUID
}

export interface Todo extends MetaField, TodoField {}

export interface WatchPayload {
  img?: string;
  link?: string;
  range?: number;
  measure?: string;
  progress?: number;
  epoch?: number;
  checkpoints?: [string, number][];
  review?: string;
  quotes?: string;
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

export interface WatchField {
  type: WatchType;
  title: string;
  status: WatchStatus;
  year: number;
  rate: number;
  payload: WatchPayload;
  author: string;
}

export interface Watch extends MetaField, WatchField {}

export interface QuickNoteField {
  title: string;
  draft: string; // UUID
  order: number;
}

export interface QuickNote extends MetaField, QuickNoteField {}

export type EchoType = "Week" | "Year" | "Decade";
export const EchoEnum: {
  WEEK: EchoType;
  YEAR: EchoType;
  DECADE: EchoType;
} = {
  WEEK: "Week",
  YEAR: "Year",
  DECADE: "Decade",
};

export interface EchoField {
  type: EchoType;
  year: number;
  sub: number;
  draft: string; // UUID
  mark: boolean;
}

export interface Echo extends MetaField, EchoField {}

export interface CollectionField {
  name: string;
}

export interface Collection extends MetaField, CollectionField {}

export type DomainType =
  | "技术"
  | "知识"
  | "健康"
  | "个人发展"
  | "社会文化"
  | "生活"
  | "金融"
  | "艺术"
  | "自然"
  | "杂录";

export const Domain: {
  TEC: DomainType;
  KNL: DomainType;
  HEA: DomainType;
  PER: DomainType;
  SOC: DomainType;
  LIF: DomainType;
  BUS: DomainType;
  ART: DomainType;
  ENV: DomainType;
  MIS: DomainType;
} = {
  TEC: "技术",
  KNL: "知识",
  HEA: "健康",
  PER: "个人发展",
  SOC: "社会文化",
  LIF: "生活",
  BUS: "金融",
  ART: "艺术",
  ENV: "自然",
  MIS: "杂录",
};

type BookmarkPayload = {
  whats?: string[];
  hows?: string[];
  draft?: string; // UUID
};

export interface BookmarkField {
  url: string;
  title: string;
  domain: DomainType;
  payload: BookmarkPayload;
}

export interface Bookmark extends MetaField, BookmarkField {}

export type BlogType = "Private" | "Public" | "Archived";
export const BlogEnum: {
  PRIVATE: BlogType;
  PUBLIC: BlogType;
  ARCHIVED: BlogType;
} = {
  PRIVATE: "Private",
  PUBLIC: "Public",
  ARCHIVED: "Archived",
};

export const BlogTypeText: {
  [BlogEnum.PRIVATE]: I18nText;
  [BlogEnum.PUBLIC]: I18nText;
  [BlogEnum.ARCHIVED]: I18nText;
} = {
  [BlogEnum.PRIVATE]: {
    [UserLangEnum.ZHCN]: "未发布",
    [UserLangEnum.ENUS]: "Private",
  },
  [BlogEnum.PUBLIC]: {
    [UserLangEnum.ZHCN]: "公开可见",
    [UserLangEnum.ENUS]: "Public",
  },
  [BlogEnum.ARCHIVED]: {
    [UserLangEnum.ZHCN]: "已归档",
    [UserLangEnum.ENUS]: "Archived",
  },
};

export type BlogPayload = {
  whats?: string[];
  hows?: string[];
};

export interface BlogField {
  title: string;
  visibility: BlogType;
  draft: string; // UUID
  payload: BlogPayload;
}

export interface Blog extends MetaField, BlogField {}

export interface DashboardData {
  users: User[];
  tags: Tag[];
  blogs: Blog[];
  bookmarks: Bookmark[];
  collections: Collection[];
  echoes: Echo[];
  quickNotes: QuickNote[];
  todos: Todo[];
  watches: Watch[];
  tiptaps: TiptapV2[];
}
