import { useQuery, useMutation } from "@tanstack/react-query";
import { journalDatabase } from "@/lib/journal/db-interface";
import { type EntryField } from "@/lib/journal/model";
import keys from "./query-keys";
import { createTiptap } from "./use-tiptapv2";
import { createTags, parseTags, type LocTreeNode } from "./use-tagv2";
import {
  getWordsCount,
  getCurrentYear,
  getEntryDate,
  getAllDates,
} from "@/lib/journal/statistics";
import { syncClient } from "@/lib/journal/sync-client";
import { EntryMeta, type QueryCondition } from "@/lib/journal/model";

export type CurrentYearCount = {
  date: string;
  count: number;
  level: number;
};

export { EntryMeta };
export type { QueryCondition };

export async function listEntries(
  page: number = 1,
  condition: QueryCondition[] = [],
): Promise<{ entries: EntryMeta[]; hasMore: boolean }> {
  return syncClient.listEntries(page, condition);
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

export function useGetWordsCount() {
  return useQuery<number>({
    queryKey: keys.entries.meta("words"),
    queryFn: async () => {
      return getWordsCount();
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
      // Try to get from local database first
      const entryDateStat = await getEntryDate();
      const allDatesStat = await getAllDates();

      const dates: DatesTree = [];
      if (Object.keys(entryDateStat).length > 0) {
        for (const [yearStr, months] of Object.entries(entryDateStat)) {
          const year = parseInt(yearStr, 10);
          const monthsArray: { month: number; days: number[] }[] = [];
          for (const [monthStr, days] of Object.entries(months)) {
            monthsArray.push({
              month: parseInt(monthStr, 10),
              days: days,
            });
          }
          monthsArray.sort((a, b) => b.month - a.month);
          dates.push({ year, months: monthsArray });
        }
        dates.sort((a, b) => b.year - a.year);
      }
      return { dates, count: allDatesStat };
    },
  });
}

export function useGetCurrentYear() {
  return useQuery<{ activity: CurrentYearCount[]; count: number }>({
    queryKey: keys.entries.meta("currentYear"),
    queryFn: async () => {
      const stat = await getCurrentYear();

      const currentYear = new Date().getFullYear();
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const yearStartStr = `${currentYear}-01-01`;

      // Build activity array from existing data
      const activity: CurrentYearCount[] = [];
      if (Object.keys(stat).length > 0) {
        const sortedDates = Object.keys(stat).sort();
        for (const date of sortedDates) {
          const count = stat[date] ?? 0;
          const level = Math.min(count, 4);
          activity.push({ date, count, level });
        }
      }

      // Ensure start of year is included
      if (activity.length === 0 || activity[0].date !== yearStartStr) {
        activity.unshift({ date: yearStartStr, count: 0, level: 0 });
      }

      // Ensure today is included
      if (
        activity.length === 0 ||
        activity[activity.length - 1].date !== todayStr
      ) {
        activity.push({ date: todayStr, count: 0, level: 0 });
      }

      // Calculate total count
      const totalCount = Object.values(stat).reduce(
        (sum, count) => sum + count,
        0,
      );

      return { activity, count: totalCount };
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
