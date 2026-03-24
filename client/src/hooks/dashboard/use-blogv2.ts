import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import { createTiptapWithTitle } from "./use-tiptapv2";
import { ensureTags } from "./use-bookmarkv2";
import keys from "./query-keys";
import {
  BlogEnum,
  type BlogField,
  type BlogPayload,
} from "@/lib/dashboard/model";

export function useBlogs() {
  return useQuery({
    queryKey: keys.blogs.all,
    queryFn: async () => {
      return dashboardDatabase.getBlogs();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateBlog() {
  return useMutation({
    mutationFn: async (data: { title: string; payload: BlogPayload }) => {
      const draftId = await createTiptapWithTitle(data.title);
      await ensureTags(data.payload);
      return dashboardDatabase.addBlog({
        ...data,
        visibility: BlogEnum.PRIVATE,
        draft: draftId,
      });
    },
  });
}

export function useUpdateBlog() {
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BlogField>;
    }) => {
      if (data.payload) {
        await ensureTags(data.payload);
      }
      return dashboardDatabase.updateBlog(id, data);
    },
  });
}
