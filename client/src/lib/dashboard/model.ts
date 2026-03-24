import type { MetaField, Tag, TiptapV2 } from "@/lib/model";

export const SchemaVersion = 1;

export interface TodoField {
  title: string;
  completed: boolean;
  collectionId: string; // UUID
  difficulty: number;
  order: number;
  link: string;
  draft: string; // UUID
  schedule: number;
  done: boolean;
  count: number;
  kanban: string; // UUID
}

export interface Todo extends MetaField, TodoField {}

export interface WatchField {
  type: string;
  title: string;
  status: string;
  year: number;
  rate: number;
  payload: Record<string, unknown>;
  author: string;
}

export interface Watch extends MetaField, WatchField {}

export interface QuickNoteField {
  title: string;
  draft: string; // UUID
  order: number;
}

export interface QuickNote extends MetaField, QuickNoteField {}

export interface EchoField {
  type: string;
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

export interface BookmarkField {
  url: string;
  title: string;
  click: number;
  domain: string;
  payload: Record<string, unknown>;
}

export interface Bookmark extends MetaField, BookmarkField {}

export interface BlogField {
  title: string;
  visibility: string;
  draft: string; // UUID
  payload: Record<string, unknown>;
}

export interface Blog extends MetaField, BlogField {}

export interface DashboardData {
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
