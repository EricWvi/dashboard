import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Bookmark = {
  id: number;
  title: string;
  url: string;
  click: number;
  domain: DomainType;
  payload: any;
};

export type DomainType =
  | "技术"
  | "知识"
  | "健康"
  | "个人发展"
  | "社会文化"
  | "生活"
  | "金融"
  | "艺术"
  | "自然"
  | "杂录";
export const Domain: {
  TEC: DomainType;
  KNL: DomainType;
  HEA: DomainType;
  PER: DomainType;
  SOC: DomainType;
  LIF: DomainType;
  BUS: DomainType;
  ART: DomainType;
  ENV: DomainType;
  MIS: DomainType;
} = {
  TEC: "技术",
  KNL: "知识",
  HEA: "健康",
  PER: "个人发展",
  SOC: "社会文化",
  LIF: "生活",
  BUS: "金融",
  ART: "艺术",
  ENV: "自然",
  MIS: "杂录",
};

const keyBookmarks = () => ["/api/bookmarks"];
const keyTags = () => ["/api/tags"];

export function useBookmarks() {
  return useQuery({
    queryKey: keyBookmarks(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/bookmark?Action=ListBookmarks",
        {},
      );
      const data = await response.json();
      return data.message.bookmarks as Bookmark[];
    },
  });
}

export function clickBookmark(id: number) {
  apiRequest("POST", "/api/bookmark?Action=ClickBookmark", { id });
}

export type Tag = {
  value: string;
  label: string;
};

const TagsQueryOptions = {
  queryKey: keyTags(),
  queryFn: async () => {
    const response = await apiRequest(
      "POST",
      "/api/bookmark?Action=ListTags",
      {},
    );
    const data = await response.json();
    const whatTags: Tag[] = [];
    const howTags: Tag[] = [];
    data.message.tags.forEach((tag: string) => {
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
};

export function useTags() {
  return useQuery(TagsQueryOptions);
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Bookmark, "id" | "click">) => {
      const response = await apiRequest(
        "POST",
        "/api/bookmark?Action=CreateBookmark",
        {
          ...data,
        },
      );
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
        queryKey: keyBookmarks(),
      });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number }) => {
      const response = await apiRequest(
        "POST",
        "/api/bookmark?Action=DeleteBookmark",
        {
          ...data,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyBookmarks(),
      });
    },
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number } & Partial<Bookmark>) => {
      const response = await apiRequest(
        "POST",
        "/api/bookmark?Action=UpdateBookmark",
        {
          ...data,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyBookmarks(),
      });
    },
  });
}
