import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest, queryClient } from "@/lib/queryClient";
import { createTiptap, keyDraft, type Draft } from "@/hooks/use-draft";
import { keyTags, type LocTreeNode, TagsQueryOptions } from "./use-tagv2";

export type Entry = {
  id: number;
  draft: number;
  visibility: string;
  createdAt: string;
  wordCount: number;
  rawText: string;
  bookmark: boolean;
  payload: Payload;
};

export interface Payload {
  tags?: string[];
  location?: string[];
}

export type CurrentYearCount = {
  date: string;
  count: number;
  level: number;
};

export class EntryMeta {
  id: number;
  draft: number;
  year: number;
  month: number;
  day: number;

  constructor(
    id: number,
    draft: number,
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
  value: string | string[];
}

const keyEntry = (id: number) => ["/api/entry", id] as const;
const keyMetaItem = (item: string) => ["/api/meta", item] as const;
const keyMeta = () => ["/api/meta"] as const;

export async function listEntries(
  page: number = 1,
  condition: QueryCondition[] = [],
): Promise<[EntryMeta[], boolean]> {
  const response = await getRequest(
    `/api/entry?Action=GetEntries&page=${page}&condition=${JSON.stringify(condition)}`,
  );
  const data = await response.json();

  (data.message.drafts as Draft[]).map((draft) => {
    queryClient.setQueryData(keyDraft(draft.id), draft);
  });

  const metas = (data.message.entries as Entry[]).map((entry) => {
    queryClient.setQueryData(keyEntry(entry.id), entry);
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

export const EntryQueryOptions = (id: number) => ({
  queryKey: keyEntry(id),
  enabled: !!id,
  queryFn: async () => {
    const response = await getRequest(`/api/entry?Action=GetEntry&id=${id}`);
    const data = await response.json();
    return data.message;
  },
});

export function useEntry(id: number) {
  return useQuery<Entry>(EntryQueryOptions(id));
}

export async function createEntry(): Promise<[number, number]> {
  const draft = await createTiptap();
  const response = await postRequest("/api/entry?Action=CreateEntry", {
    draft,
  });
  return response.json().then((data) => [data.message.id, draft]);
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<Entry>) => {
      const response = await postRequest("/api/entry?Action=UpdateEntry", {
        id,
        ...data,
      });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      if (variables.payload) {
        const { tags, locTree } = await queryClient.fetchQuery(TagsQueryOptions);

        const tagValues = tags.map((tag) => tag.value);
        const existingLocPaths = flattenLocTree(locTree);

        const filteredTags = (variables.payload.tags || [])
          .filter((tag: string) => !tagValues.includes(tag))
          .map((tag: string) => "tag:" + tag);

        const location = variables.payload.location || [];
        const locPaths: string[] = [];
        location.forEach((loc, index) => {
          if (loc) {
            const path = location.slice(0, index + 1).join("/");
            if (!existingLocPaths.includes(path)) {
              locPaths.push("loc:" + path);
            }
          }
        });

        const newTags = [...filteredTags, ...locPaths];
        if (newTags.length > 0) {
          await postRequest("/api/bookmark?Action=CreateTags", {
            tags: newTags,
            group: "journal",
          });
          queryClient.invalidateQueries({
            queryKey: keyTags(),
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: keyEntry(variables.id) });
    },
  });
}

export async function deleteEntry(id: number) {
  return postRequest("/api/entry?Action=DeleteEntry", { id });
}

export function refreshMeta() {
  queryClient.invalidateQueries({ queryKey: keyMeta(), exact: false });
}

export function useGetEntriesCount(year: number) {
  return useQuery<number>({
    queryKey: keyMetaItem(`entryCount/${year}`),
    enabled: !!year,
    queryFn: async () => {
      const response = await getRequest(`/api/entry?Action=GetEntriesCount&year=${year}`);
      const data = await response.json();
      return data.message.count;
    },
  });
}

export function useGetWordsCount() {
  return useQuery<number>({
    queryKey: keyMetaItem("words"),
    queryFn: async () => {
      const response = await getRequest("/api/entry?Action=GetWordsCount");
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
    queryKey: keyMetaItem("dates"),
    queryFn: async () => {
      const response = await getRequest("/api/entry?Action=GetEntryDate");
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
    queryKey: keyMetaItem("currentYear"),
    queryFn: async () => {
      const response = await getRequest("/api/entry?Action=GetCurrentYear");
      const data = await response.json();
      return data.message;
    },
  });
}

export function useBookmarkEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await postRequest("/api/entry?Action=BookmarkEntry", { id });
      return response.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: keyEntry(id) });
    },
  });
}

export function useUnbookmarkEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await postRequest("/api/entry?Action=UnbookmarkEntry", {
        id,
      });
      return response.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: keyEntry(id) });
    },
  });
}
