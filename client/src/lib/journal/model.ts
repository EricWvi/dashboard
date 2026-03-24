import type { MetaField, Tag, TiptapV2 } from "@/lib/model";

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

export interface JournalData {
  entries: Entry[];
  tags: Tag[];
  tiptaps: TiptapV2[];
}
