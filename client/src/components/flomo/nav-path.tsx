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

export function NavPath({ currentFolderId }: NavPathProps) {
  const { language } = useUserContextV2();
  const { data: path } = useFolderPath(currentFolderId);
  const { isArchiveMode, setCurrentFolderId } = useAppState();

  if (isArchiveMode) {
    const index = path?.findIndex((f) => f.isArchived === 1) ?? -1;
    const filteredPath = index !== -1 ? path!.slice(index) : path;

    return (
      <SidebarGroup>
        <SidebarMenu>
          <div className="flex flex-col">
            <div
              className={cn(
                "cursor-pointer text-sm",
                currentFolderId === ArchiveFolderId
                  ? "font-medium"
                  : "text-muted-foreground",
              )}
              onClick={() => setCurrentFolderId(ArchiveFolderId)}
            >
              {i18nText[language].archived}
            </div>
            {filteredPath?.map((segment, index) => (
              <div
                key={index}
                className={cn(
                  "cursor-pointer border-l-2 border-border ml-1 pl-3 py-1 text-sm",
                  index === filteredPath.length - 1
                    ? "font-medium"
                    : "text-muted-foreground",
                )}
                onClick={() => setCurrentFolderId(segment.id)}
              >
                {segment.title}
              </div>
            ))}
          </div>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <div className="flex flex-col">
          <div
            className={cn(
              "cursor-pointer text-sm",
              !path?.length ? "font-medium" : "text-muted-foreground",
            )}
            onClick={() => setCurrentFolderId(RootFolderId)}
          >
            {i18nText[language].home}
          </div>
          {path?.map((segment, index) => (
            <div
              key={index}
              className={cn(
                "cursor-pointer border-l-2 border-border ml-1 pl-3 py-1 text-sm",
                index === path.length - 1
                  ? "font-medium"
                  : "text-muted-foreground",
              )}
              onClick={() => setCurrentFolderId(segment.id)}
            >
              {segment.title}
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
