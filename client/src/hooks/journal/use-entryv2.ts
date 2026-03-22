import { useQuery, useMutation } from "@tanstack/react-query";
import { journalDatabase } from "@/lib/journal/db-interface";
import { type EntryField } from "@/lib/journal/model";
import keys from "./query-keys";
import { createTiptap } from "./use-tiptapv2";
import { createTags, parseTags, type LocTreeNode } from "./use-tagv2";
import { getRequest } from "@/lib/queryClient";

export type CurrentYearCount = {
  date: string;
  count: number;
  level: number;
};

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

export async function listEntries(
  page: number = 1,
  condition: QueryCondition[] = [],
): Promise<[EntryMeta[], boolean]> {
  const response = await getRequest(
    `/api/journal?Action=GetEntries&page=${page}&condition=${JSON.stringify(condition)}`,
  );
  const data = await response.json();

  const metas = (
    data.message.entries as { createdAt: string; id: string; draft: string }[]
  ).map((entry) => {
    const time = new Date(entry.createdAt);
    return new EntryMeta(
      entry.id,
      entry.draft,
      time.getFullYear(),
      time.getMonth() + 1,
      time.getDate(),
    );
  });

  return [metas, data.message.hasMore];
}

export function useEntry(id: string) {
  return useQuery({
    enabled: !!id,
    queryKey: keys.entries.detail(id),
    queryFn: async () => {
      return journalDatabase.getEntry(id);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export async function createEntry(): Promise<[string, string]> {
  const draftId = await createTiptap();
  const entryId = await journalDatabase.addEntry({
    draft: draftId,
    payload: {},
    wordCount: 0,
    rawText: "",
    bookmark: false,
  });
  return [entryId, draftId];
}

function flattenLocTree(nodes: LocTreeNode[]): string[] {
  const result: string[] = [];
  nodes.forEach((node) => {
    result.push(node.value);
    if (node.children.length > 0) {
      result.push(...flattenLocTree(node.children));
    }
  });
  return result;
}

export function useUpdateEntry() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<EntryField>;
    }) => {
      await journalDatabase.updateEntry(id, data);
      if (data.payload) {
        const { tags, locTree } = await parseTags();
        // filter out newly created tags
        const tagValues = tags.map((tag) => tag.value);
        const existingLocPaths = flattenLocTree(locTree);

        const filteredTags = (data.payload.tags || [])
          .filter((tag: string) => !tagValues.includes(tag))
          .map((tag: string) => "tag:" + tag);

        // build location paths and filter new ones
        const location = data.payload.location || [];
        const locPaths: string[] = [];
        location.forEach((loc, index) => {
          if (loc) {
            const path = location.slice(0, index + 1).join("/");
            if (!existingLocPaths.includes(path)) {
              locPaths.push("loc:" + path);
            }
          }
        });

        // create new tags
        const newTags = [...filteredTags, ...locPaths];
        if (newTags.length > 0) {
          await createTags(newTags);
        }
      }
    },
  });
}

export async function deleteEntry(id: string) {
  return journalDatabase.softDeleteEntry(id);
}

export function useGetEntriesCount(year: number) {
  return useQuery<number>({
    queryKey: keys.entries.meta("entryCount/" + year),
    enabled: !!year,
    queryFn: async () => {
      const response = await getRequest(
        `/api/journal?Action=GetEntriesCount&year=${year}`,
      );
      const data = await response.json();
      return data.message.count;
    },
  });
}

export function useGetWordsCount() {
  return useQuery<number>({
    queryKey: keys.entries.meta("words"),
    queryFn: async () => {
      const response = await getRequest("/api/journal?Action=GetWordsCount");
      const data = await response.json();
      return data.message.count;
    },
  });
}

export type DatesTree = {
  year: number;
  months: {
    month: number;
    days: number[];
  }[];
}[];

export interface DatesWithCount {
  dates: DatesTree;
  count: number;
}

export function useGetEntryDate() {
  return useQuery<DatesWithCount>({
    queryKey: keys.entries.meta("dates"),
    queryFn: async () => {
      const response = await getRequest("/api/journal?Action=GetEntryDate");
      const data = await response.json();
      return {
        dates: data.message.entryDates,
        count: data.message.total,
      };
    },
  });
}

export function useGetCurrentYear() {
  return useQuery<{ activity: CurrentYearCount[]; count: number }>({
    queryKey: keys.entries.meta("currentYear"),
    queryFn: async () => {
      const response = await getRequest("/api/journal?Action=GetCurrentYear");
      const data = await response.json();
      return data.message;
    },
  });
}

export function useBookmarkEntry() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return journalDatabase.updateEntry(id, { bookmark: true });
    },
  });
}

export function useUnbookmarkEntry() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return journalDatabase.updateEntry(id, { bookmark: false });
    },
  });
}
