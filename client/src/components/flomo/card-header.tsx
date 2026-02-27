import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserLangEnum } from "@/lib/model";

export function CardHeader() {
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
    edit: "编辑",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
  },
};
