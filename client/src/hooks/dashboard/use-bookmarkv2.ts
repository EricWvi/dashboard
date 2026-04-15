import {
  useMutation,
  useQuery,
  type PlaceholderDataFunction,
} from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import keys from "./query-keys";
import { Domain, type BookmarkField, type DomainType } from "@/lib/dashboard/model";
export { Domain, type DomainType } from "@/lib/dashboard/model";
export type Bookmark = BookmarkField & { id: string; click?: number };

export function useBookmarks() {
  return useQuery({
    queryKey: keys.bookmarks.all,
    queryFn: async () => {
      return dashboardDatabase.getBookmarks();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export type Tag = {
  value: string;
  label: string;
};

interface TagsData {
  whatTags: Tag[];
  howTags: Tag[];
}

export const TagsQueryOptions = {
  queryKey: keys.tags.all,
  queryFn: async () => {
    const allTags = await dashboardDatabase.getAllTags();
    const whatTags: Tag[] = [];
    const howTags: Tag[] = [];

    allTags
      .map((tag) => tag.name)
      .sort()
      .forEach((tag) => {
        if (tag.startsWith("what:")) {
          const t = tag.replace("what:", "");
          whatTags.push({ value: t, label: t });
        } else if (tag.startsWith("how:")) {
          const t = tag.replace("how:", "");
          howTags.push({ value: t, label: t });
        }
      });

    return { whatTags, howTags };
  },
  staleTime: Infinity,
  placeholderData: ((previousData) =>
    previousData) as PlaceholderDataFunction<TagsData>,
};

export function useTags() {
  return useQuery(TagsQueryOptions);
}

export async function ensureTags(payload: {
  whats?: string[];
  hows?: string[];
}) {
  const { whatTags, howTags } = await TagsQueryOptions.queryFn();
  // filter out newly created tags
  const whatValues = whatTags.map((tag) => tag.value);
  const howValues = howTags.map((tag) => tag.value);
  const filteredWhats = (payload.whats || [])
    .filter((tag: string) => !whatValues.includes(tag))
    .map((tag: string) => "what:" + tag);
  const filteredHows = (payload.hows || [])
    .filter((tag: string) => !howValues.includes(tag))
    .map((tag: string) => "how:" + tag);
  // create new tags
  const newTags = [...filteredWhats, ...filteredHows];
  if (newTags.length > 0) {
    await Promise.all(
      newTags.map((tag) => dashboardDatabase.addTag({ name: tag })),
    );
  }
}

export function useCreateBookmark() {
  return useMutation({
    mutationFn: async (data: BookmarkField) => {
      await ensureTags(data.payload);
      return dashboardDatabase.addBookmark(data);
    },
  });
}

export function useDeleteBookmark() {
  return useMutation({
    mutationFn: async (data: string | number | { id: string | number }) => {
      const id = typeof data === "object" ? data.id : data;
      await dashboardDatabase.softDeleteBookmark(String(id));
    },
  });
}

export function useUpdateBookmark() {
  return useMutation({
    mutationFn: async (
      params:
        | { id: string | number; data: Partial<BookmarkField> }
        | ({ id: string | number } & Partial<BookmarkField>),
    ) => {
      const { id } = params;
      const data =
        "data" in params ? params.data : (({ id, ...rest }) => rest)(params);
      if (data.payload) {
        await ensureTags(data.payload);
      }
      return dashboardDatabase.updateBookmark(String(id), data);
    },
  });
}

export function clickBookmark(_id: string | number) {}
