import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useFolderPath } from "@/hooks/flomo/use-folders";
import { RootFolderId } from "@/lib/flomo/model";
import { UserLangEnum } from "@/lib/model";
import { cn } from "@/lib/utils";
import { useUserContextV2 } from "@/user-provider";
import { Fragment } from "react";

interface CardHeaderProps {
  currentFolderId: string;
}

export function CardHeader({ currentFolderId }: CardHeaderProps) {
  const { language } = useUserContextV2();
  const { data: path } = useFolderPath(currentFolderId);
  const { setCurrentFolderId } = useAppState();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
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
      </div>
    </header>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    home: "根目录",
    edit: "编辑",
  },
  [UserLangEnum.ENUS]: {
    home: "Home",
    edit: "Edit",
  },
};
