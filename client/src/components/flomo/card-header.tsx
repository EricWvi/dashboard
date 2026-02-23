import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";

interface CardHeaderProps {
  currentFolderId: string;
}

export function CardHeader({ currentFolderId }: CardHeaderProps) {
  const { language } = useUserContextV2();
  const { isArchiveMode } = useAppState();

  if (isArchiveMode) {
    return (
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
      </div>
    </header>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    home: "根目录",
    archived: "归档",
    edit: "编辑",
  },
  [UserLangEnum.ENUS]: {
    home: "Home",
    archived: "Archived",
    edit: "Edit",
  },
};
