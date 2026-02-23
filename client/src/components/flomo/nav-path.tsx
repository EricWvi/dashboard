import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useFolderPath } from "@/hooks/flomo/use-folders";
import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import { UserLangEnum } from "@/lib/model";
import { cn } from "@/lib/utils";
import { useUserContextV2 } from "@/user-provider";

interface NavPathProps {
  currentFolderId: string;
}

interface PathItem {
  id: string;
  title: string;
  isCurrent: boolean;
}

function TreeNode({ item, isFirst }: { item: PathItem; isFirst: boolean }) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-center py-1.5 text-sm",
        item.isCurrent ? "font-medium" : "text-muted-foreground",
      )}
    >
      {/* Vertical line - hide for first item */}
      {!isFirst && (
        <div className="border-border absolute top-0 left-[8px] h-full w-px -translate-y-1/2 border-l" />
      )}
      {/* Horizontal line */}
      <div className="border-border absolute left-[7px] h-px w-3 border-t" />
      {/* Circle */}
      <div
        className={cn(
          "bg-background relative z-10 ml-[3px] h-[11px] w-[11px] rounded-full border-2",
          item.isCurrent ? "border-primary" : "border-muted-foreground/40",
        )}
      />
      {/* Label */}
      <span className="ml-3">{item.title}</span>
    </div>
  );
}

export function NavPath({ currentFolderId }: NavPathProps) {
  const { language } = useUserContextV2();
  const { data: path } = useFolderPath(currentFolderId);
  const { isArchiveMode, setCurrentFolderId } = useAppState();

  if (isArchiveMode) {
    const index = path?.findIndex((f) => f.isArchived === 1) ?? -1;
    const filteredPath = index !== -1 ? path!.slice(index) : path;

    const items: PathItem[] = [
      {
        id: ArchiveFolderId,
        title: i18nText[language].archived,
        isCurrent: currentFolderId === ArchiveFolderId,
      },
      ...(filteredPath?.map((segment) => ({
        id: segment.id,
        title: segment.title,
        isCurrent: segment.id === currentFolderId,
      })) ?? []),
    ];

    return (
      <SidebarGroup>
        <SidebarMenu>
          <div className="flex flex-col p-2">
            {items.map((item, index) => (
              <div key={item.id} onClick={() => setCurrentFolderId(item.id)}>
                <TreeNode item={item} isFirst={index === 0} />
              </div>
            ))}
          </div>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  const items: PathItem[] = [
    {
      id: RootFolderId,
      title: i18nText[language].home,
      isCurrent: !path?.length,
    },
    ...(path?.map((segment) => ({
      id: segment.id,
      title: segment.title,
      isCurrent: segment.id === currentFolderId,
    })) ?? []),
  ];

  return (
    <SidebarGroup>
      <SidebarMenu>
        <div className="flex flex-col p-2">
          {items.map((item, index) => (
            <div key={item.id} onClick={() => setCurrentFolderId(item.id)}>
              <TreeNode item={item} isFirst={index === 0} />
            </div>
          ))}
        </div>
      </SidebarMenu>
    </SidebarGroup>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    home: "根目录",
    archived: "归档",
  },
  [UserLangEnum.ENUS]: {
    home: "Home",
    archived: "Archived",
  },
};
