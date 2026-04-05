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

export interface Statistic {
  stKey: string;
  stValue: unknown;
}

export interface JournalDataWithStats extends JournalData {
  statistics: Statistic[];
}

export class EntryMeta {
  id: string;
  draft: string;
  year: number;
  month: number;
  day: number;

  constructor(
    id: string,
    draft: string,
    year: number,
    month: number,
    day: number,
  ) {
    this.id = id;
    this.draft = draft;
    this.year = year;
    this.month = month;
    this.day = day;
  }

  isToday(): boolean {
    const today = new Date();
    return (
      this.year === today.getFullYear() &&
      this.month === today.getMonth() + 1 &&
      this.day === today.getDate()
    );
  }

  isYesterday(): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      this.year === yesterday.getFullYear() &&
      this.month === yesterday.getMonth() + 1 &&
      this.day === yesterday.getDate()
    );
  }
}

export interface QueryCondition {
  operator: string;
  value: any;
}
