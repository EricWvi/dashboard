import type { MetaField } from "@/lib/model";

export const SchemaVersion = 1;

// Blog
export interface BlogField {
  title: string;
  visibility: string;
  draft: string; // UUID
  payload: Record<string, unknown>;
}

export interface Blog extends MetaField, BlogField {}

// Bookmark
export interface BookmarkField {
  url: string;
  title: string;
  click: number;
  domain: string;
  payload: Record<string, unknown>;
}

export interface Bookmark extends MetaField, BookmarkField {}

// Collection
export interface CollectionField {
  name: string;
}

export interface Collection extends MetaField, CollectionField {}

// Echo
export interface EchoField {
  type: string;
  year: number;
  sub: number;
  draft: string; // UUID
  mark: boolean;
}

export interface Echo extends MetaField, EchoField {}

// QuickNote
export interface QuickNoteField {
  title: string;
  draft: string; // UUID
  order: number;
}

export interface QuickNote extends MetaField, QuickNoteField {}

// Tag
export interface TagField {
  name: string;
  group: string;
}

export interface Tag extends MetaField, TagField {}

// Todo
export interface TodoField {
  title: string;
  completed: boolean;
  collectionId: string; // UUID
  difficulty: number;
  order: number;
  link: string;
  draft: string; // UUID
  kanban: string; // UUID
  schedule: number | null;
  done: boolean;
  count: number;
}

export interface Todo extends MetaField, TodoField {}

// Watch
export interface WatchField {
  title: string;
  type: string;
  status: string;
  year: number;
  rate: number;
  payload: Record<string, unknown>;
  author: string;
}

export interface Watch extends MetaField, WatchField {}
