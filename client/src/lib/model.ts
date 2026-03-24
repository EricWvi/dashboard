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
  history: { time: number; content: Record<string, unknown> }[];
}

export interface TiptapV2 extends MetaField, TiptapV2Field {}

export interface TagField {
  name: string;
}

export interface Tag extends MetaField, TagField {}

export interface SyncMeta {
  key: string;
  value: number | string;
}

export type UserLang = "zh-CN" | "en-US";
export const UserLangEnum: {
  ZHCN: UserLang;
  ENUS: UserLang;
} = {
  ZHCN: "zh-CN",
  ENUS: "en-US",
};

export interface UserField {
  username: string;
  email: string;
  avatar: string;
  language: UserLang;
}

export interface User extends UserField {
  key: string;
  updatedAt: number; // Unix timestamp in milliseconds
  syncStatus: number;
}
