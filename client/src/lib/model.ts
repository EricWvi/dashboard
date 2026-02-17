export const SyncStatus: {
  Synced: number;
  Pending: number;
} = {
  Synced: 1,
  Pending: 2,
};

export interface MetaField {
  id: string; // UUID
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
  isDeleted: boolean;
  syncStatus: number;
}

export interface TiptapV2Field {
  content: Record<string, unknown>;
  history: unknown[];
}

export interface TiptapV2 extends MetaField, TiptapV2Field {}

export interface SyncMeta {
  key: string;
  value: number | string;
}
