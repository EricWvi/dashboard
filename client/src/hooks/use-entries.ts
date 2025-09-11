import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest, queryClient } from "@/lib/queryClient";

export type Entry = {
  id: number;
  draft: number;
  visibility: string;
  createdAt: string;
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
  field: string; // e.g., "date", "tag", "place"
  operator: string; // e.g., "eq", "in", "between", "like"
  value: any; // string, number, array, etc.
}

const keyEntry = (id: number) => ["/api/entry", id];
const keyMeta = () => ["/api/meta"];

export async function listEntries(
  page: number = 1,
  condition: QueryCondition[] = [],
): Promise<[EntryMeta[], boolean]> {
  const response = await getRequest(
    `/api/entry?Action=GetEntries&page=${page}&condition=${condition}`,
  );
  const data = await response.json();
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

export function useEntry(id: number) {
  return useQuery<Entry>({
    queryKey: keyEntry(id),
    enabled: !!id,
    queryFn: async () => {
      const response = await getRequest(`/api/entry?Action=GetEntry&id=${id}`);
      const data = await response.json();
      return data["message"];
    },
  });
}

export async function createEntry(): Promise<number> {
  const response = await getRequest("/api/entry?Action=CreateEntry");
  const data = await response.json();
  return data["message"].draft;
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: keyEntry(variables.id) });
    },
  });
}

// TODO useDeleteEntry fix bug
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await postRequest("/api/entry?Action=DeleteEntry", { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage"] });
      queryClient.invalidateQueries({ queryKey: keyMeta(), exact: false });
    },
  });
}
