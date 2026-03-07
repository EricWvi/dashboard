import { NavFolders } from "./nav-folders";
import { NavCards } from "./nav-cards";
import { NavAdds } from "./nav-adds";
import { NavTabs } from "./nav-tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { FlomoLogo, FlomoText } from "./icons";
import { Search } from "lucide-react";
import { NavPath } from "./nav-path";
import { useEditorState } from "@/hooks/use-editor-state";

export function AppSidebar() {
  const { hideTabs } = useEditorState();
  const { currentFolderId } = useAppState();
  if (currentFolderId === undefined) {
    return null;
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center">
            <div className="size-8 rounded-lg">
              <FlomoLogo />
            </div>
            <div className="fill-foreground h-4">
              <FlomoText />
            </div>
          </div>

          <div
            className="hover:bg-emoji-accent cursor-pointer rounded-md p-2"
            onClick={() => hideTabs()}
          >
            <Search className="size-4 stroke-[2.5]" />
          </div>
        </div>
        <NavPath currentFolderId={currentFolderId} />
      </SidebarHeader>
      <SidebarContent
        className="pb-10"
        style={{
          maskImage: `linear-gradient(
            to bottom,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 1) 94%,
            rgba(0, 0, 0, 0) 100%
          )`,
        }}
      >
        <NavFolders currentFolderId={currentFolderId} />
        <NavCards currentFolderId={currentFolderId} />
      </SidebarContent>
      <SidebarFooter>
        <NavAdds />
        <NavTabs />
      </SidebarFooter>
    </Sidebar>
  );
}
