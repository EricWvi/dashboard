import { useQuery } from "@tanstack/react-query";
import { getRequest } from "@/lib/queryClient";

export type Tag = {
  value: string;
  label: string;
};

export type LocTreeNode = {
  value: string;
  label: string;
  children: LocTreeNode[];
};

export const keyTags = () => ["/api/tags"] as const;

export function buildLocTree(locPaths: string[]): LocTreeNode[] {
  const root: LocTreeNode[] = [];
  const pathMap = new Map<string, LocTreeNode>();

  locPaths.sort().forEach((path) => {
    const parts = path.split("/");
    let currentLevel = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = index === 0 ? part : `${currentPath}/${part}`;

      if (!pathMap.has(currentPath)) {
        const node: LocTreeNode = {
          value: currentPath,
          label: part,
          children: [],
        };
        pathMap.set(currentPath, node);
        currentLevel.push(node);
      }

      currentLevel = pathMap.get(currentPath)!.children;
    });
  });

  return root;
}

export const TagsQueryOptions = {
  queryKey: keyTags(),
  queryFn: async () => {
    const response = await getRequest("/api/bookmark?Action=ListTags&group=journal");
    const data = await response.json();
    const tags: Tag[] = [];
    const locPaths: string[] = [];

    data.message.tags.sort().forEach((tag: string) => {
      if (tag.startsWith("tag:")) {
        const t = tag.replace("tag:", "");
        tags.push({ value: t, label: t });
      } else if (tag.startsWith("loc:")) {
        const t = tag.replace("loc:", "");
        locPaths.push(t);
      }
    });

    const locTree = buildLocTree(locPaths);
    return { tags, locTree };
  },
};

export function useTags() {
  return useQuery(TagsQueryOptions);
}
