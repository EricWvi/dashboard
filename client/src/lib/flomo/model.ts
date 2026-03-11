import type { MetaField, TiptapV2 } from "@/lib/model";

export const RootFolderId = "00000000-0000-0000-0000-000000000000";
export const ArchiveFolderId = "archive-folder-id";

export const SchemaVersion = 3;

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
  isBookmarked: 0 | 1;
  isArchived: 0 | 1;
}

export interface Card extends MetaField, CardField {}

export interface FolderPayload {
  emoji?: string;
}

export interface FolderField {
  parentId: string; // UUID
  title: string;
  payload: FolderPayload;
  isBookmarked: 0 | 1;
  isArchived: 0 | 1;
}

export interface Folder extends MetaField, FolderField {}

export interface FlomoData {
  cards: Card[];
  folders: Folder[];
  tiptaps: TiptapV2[];
}
