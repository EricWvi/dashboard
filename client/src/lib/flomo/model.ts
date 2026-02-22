import type { MetaField } from "@/lib/model";

export const RootFolderId = "00000000-0000-0000-0000-000000000000";

export const SchemaVersion = 1;

// Database models (omitting creator_id, review_count, site)
export interface CardPayload {
  emoji?: string;
}

export interface CardField {
  folderId: string; // UUID
  title: string;
  draft: string; // UUID
  payload: CardPayload;
  rawText: string;
}

export interface Card extends MetaField, CardField {}

export interface FolderPayload {
  emoji?: string;
}

export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: FolderPayload;
}

export interface Folder extends MetaField, FolderField {}
