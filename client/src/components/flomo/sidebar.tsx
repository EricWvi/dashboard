import { Command } from "lucide-react";

import { NavFolders } from "./nav-folders";
import { NavCards } from "./nav-cards";
import { NavAdds } from "./nav-adds";
import { NavTabs } from "./nav-tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/flomo/use-app-state";

export function AppSidebar() {
  const { currentFolderId } = useAppState();
  if (currentFolderId === undefined) {
    return null;
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavFolders currentFolderId={currentFolderId} />
        <NavCards currentFolderId={currentFolderId} />
        <div className="mt-auto">
          <NavAdds />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavTabs />
      </SidebarFooter>
    </Sidebar>
  );
}
