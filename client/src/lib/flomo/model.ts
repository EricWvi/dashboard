import type { MetaField } from "@/lib/model";

export const RootFolderId = "00000000-0000-0000-0000-000000000000";

// Database models (omitting creator_id, review_count, site)
export interface CardField {
  folderId: string; // UUID
  title: string;
  draft: string; // UUID
  payload: Record<string, unknown>;
  rawText: string;
}

export interface Card extends MetaField, CardField {}

export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: Record<string, unknown>;
}

export interface Folder extends MetaField, FolderField {}
