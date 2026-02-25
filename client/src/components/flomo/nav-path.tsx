import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useFolderPath } from "@/hooks/flomo/use-folders";
import { ArchiveFolderId, RootFolderId } from "@/lib/flomo/model";
import { UserLangEnum } from "@/lib/model";
import { cn } from "@/lib/utils";
import { useUserContextV2 } from "@/user-provider";
import { Fragment, useEffect, useRef } from "react";

interface NavPathProps {
  currentFolderId: string;
}

export function NavPath({ currentFolderId }: NavPathProps) {
  const { language } = useUserContextV2();
  const { data: path } = useFolderPath(currentFolderId);
  const { isArchiveMode, setCurrentFolderId } = useAppState();

  const scrollRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({
        left: container.scrollWidth, // 滚向最右侧
        behavior: "smooth",
      });
    }
  }, [path]);

  if (isArchiveMode) {
    const index = path?.findIndex((f) => f.isArchived === 1) ?? -1;
    const filteredPath = index !== -1 ? path!.slice(index) : path;

    return (
      <SidebarGroup>
        <SidebarMenu>
          <Breadcrumb>
            <BreadcrumbList
              ref={scrollRef}
              className="flex-nowrap overflow-x-auto whitespace-nowrap"
            >
              <BreadcrumbItem
                className="hidden cursor-pointer md:block"
                onClick={() => setCurrentFolderId(ArchiveFolderId)}
              >
                {currentFolderId === ArchiveFolderId ? (
                  <BreadcrumbPage>{i18nText[language].archived}</BreadcrumbPage>
                ) : (
                  i18nText[language].archived
                )}
              </BreadcrumbItem>
              {filteredPath?.map((segment, index) => (
                <Fragment key={index}>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem
                    className={cn(
                      "cursor-pointer",
                      index === filteredPath.length - 1
                        ? ""
                        : "hidden md:block",
                    )}
                    onClick={() => setCurrentFolderId(segment.id)}
                  >
                    {index === filteredPath.length - 1 ? (
                      <BreadcrumbPage>{segment.title}</BreadcrumbPage>
                    ) : (
                      segment.title
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Breadcrumb>
          <BreadcrumbList
            ref={scrollRef}
            className="flex-nowrap overflow-x-auto whitespace-nowrap"
          >
            <BreadcrumbItem
              className="hidden cursor-pointer md:block"
              onClick={() => setCurrentFolderId(RootFolderId)}
            >
              {currentFolderId === RootFolderId ? (
                <BreadcrumbPage>{i18nText[language].home}</BreadcrumbPage>
              ) : (
                i18nText[language].home
              )}
            </BreadcrumbItem>
            {path?.map((segment, index) => (
              <Fragment key={index}>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem
                  className={cn(
                    "cursor-pointer",
                    index === path.length - 1 ? "" : "hidden md:block",
                  )}
                  onClick={() => setCurrentFolderId(segment.id)}
                >
                  {index === path.length - 1 ? (
                    <BreadcrumbPage>{segment.title}</BreadcrumbPage>
                  ) : (
                    segment.title
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </SidebarMenu>{" "}
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
