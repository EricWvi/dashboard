import { useQuery } from "@tanstack/react-query";
import { journalDatabase } from "@/lib/journal/db-interface";
import keys from "./query-keys";

export type Tag = {
  value: string;
  label: string;
};

export type LocTreeNode = {
  value: string;
  label: string;
  children: LocTreeNode[];
};

function buildLocTree(locPaths: string[]): LocTreeNode[] {
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

export async function parseTags() {
  const allTags = await journalDatabase.getAllTags();
  const tags: Tag[] = [];
  const locPaths: string[] = [];

  allTags
    .map((tag) => tag.name)
    .sort()
    .forEach((tag) => {
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
}

export async function createTags(tags: string[]) {
  if (tags.length === 0) {
    return;
  }
  await Promise.all(
    tags.map((tag) =>
      journalDatabase.addTag({
        name: tag,
      }),
    ),
  );
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags.all,
    queryFn: async () => {
      return parseTags();
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}
