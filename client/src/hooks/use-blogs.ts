import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createTiptap } from "./use-draft";
import { keyTags, TagsQueryOptions } from "./use-bookmarks";

export type Blog = {
  id: number;
  title: string;
  visibility: BlogType;
  draft: number;
  payload: Payload;
  createdAt: string;
  updatedAt: string;
};

export type BlogType = "Private" | "Public" | "Archived";
export const BlogEnum: {
  PRIVATE: BlogType;
  PUBLIC: BlogType;
  ARCHIVED: BlogType;
} = {
  PRIVATE: "Private",
  PUBLIC: "Public",
  ARCHIVED: "Archived",
};

type Payload = {
  whats?: string[];
  hows?: string[];
};

const keyBlogs = () => ["/api/blogs"];

export function useBlogs() {
  return useQuery({
    queryKey: keyBlogs(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/blog?Action=ListBlogs",
        {},
      );
      const data = await response.json();
      return data.message.blogs as Blog[];
    },
  });
}

const blogInitialContent = (title: string) => [
  {
    type: "heading",
    attrs: {
      level: 3,
      textAlign: null,
    },
    content: [
      {
        text: title,
        type: "text",
      },
    ],
  },
  {
    type: "paragraph",
    attrs: { textAlign: null },
  },
];

export function useCreateBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; payload: Payload }) => {
      const draftId = await createTiptap(blogInitialContent(data.title));
      const response = await apiRequest("POST", "/api/blog?Action=CreateBlog", {
        ...data,
        visibility: BlogEnum.PRIVATE,
        draft: draftId,
      });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      const { whatTags, howTags } =
        await queryClient.fetchQuery(TagsQueryOptions);
      // filter out newly created tags
      const whatValues = whatTags.map((tag) => tag.value);
      const howValues = howTags.map((tag) => tag.value);
      const filteredWhats = (variables.payload.whats || [])
        .filter((tag: string) => !whatValues.includes(tag))
        .map((tag: string) => "what:" + tag);
      const filteredHows = (variables.payload.hows || [])
        .filter((tag: string) => !howValues.includes(tag))
        .map((tag: string) => "how:" + tag);
      // create new tags
      const newTags = [...filteredWhats, ...filteredHows];
      if (newTags.length > 0) {
        await apiRequest("POST", "/api/bookmark?Action=CreateTags", {
          tags: newTags,
        });
        queryClient.invalidateQueries({
          queryKey: keyTags(),
        });
      }

      queryClient.invalidateQueries({
        queryKey: keyBlogs(),
      });
    },
  });
}

export function useUpdateBlog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Blog>) => {
      const response = await apiRequest("POST", "/api/blog?Action=UpdateBlog", {
        ...data,
      });
      return response.json();
    },
    onSuccess: async (_data, variables) => {
      if (variables.payload) {
        const { whatTags, howTags } =
          await queryClient.fetchQuery(TagsQueryOptions);
        // filter out newly created tags
        const whatValues = whatTags.map((tag) => tag.value);
        const howValues = howTags.map((tag) => tag.value);
        const filteredWhats = (variables.payload.whats || [])
          .filter((tag: string) => !whatValues.includes(tag))
          .map((tag: string) => "what:" + tag);
        const filteredHows = (variables.payload.hows || [])
          .filter((tag: string) => !howValues.includes(tag))
          .map((tag: string) => "how:" + tag);
        // create new tags
        const newTags = [...filteredWhats, ...filteredHows];
        if (newTags.length > 0) {
          await apiRequest("POST", "/api/bookmark?Action=CreateTags", {
            tags: newTags,
          });
          queryClient.invalidateQueries({
            queryKey: keyTags(),
          });
        }
      }

      queryClient.invalidateQueries({
        queryKey: keyBlogs(),
      });
    },
  });
}
