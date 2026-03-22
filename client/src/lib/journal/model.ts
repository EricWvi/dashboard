import type { MetaField, TiptapV2 } from "@/lib/model";

export const SchemaVersion = 1;

// Entry
export interface EntryPayload {
  tags?: string[];
  location?: string[];
}

export interface EntryField {
  draft: string; // UUID
  payload: EntryPayload;
  wordCount: number;
  rawText: string;
  bookmark: boolean;
}

export interface Entry extends MetaField, EntryField {}

// Tag
export interface TagField {
  name: string;
}

export interface Tag extends MetaField, TagField {}

export interface JournalData {
  entries: Entry[];
  tags: Tag[];
  tiptaps: TiptapV2[];
}
