import type { MetaField } from "@/lib/model";

export const SchemaVersion = 1;

// Entry
export interface EntryField {
  draft: string; // UUID
  payload: Record<string, unknown>;
  wordCount: number;
  rawText: string;
  bookmark: boolean;
  reviewCount: number;
}

export interface Entry extends MetaField, EntryField {}

// Tag
export interface TagField {
  name: string;
  group: string;
}

export interface Tag extends MetaField, TagField {}
