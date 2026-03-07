import {
  Archive,
  Check,
  ChevronsUpDown,
  CloudUpload,
  Eye,
  PenLine,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserContextV2 } from "@/user-provider";
import { getSyncManager } from "@/lib/flomo/sync-manager";
import { UserLangEnum } from "@/lib/model";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useEditorState } from "@/hooks/use-editor-state";
import { cn, isTouchDevice } from "@/lib/utils";

export function NavTabs() {
  const { isMobile } = useSidebar();
  const { user } = useUserContextV2();
  const { enterArchiveMode } = useAppState();
  const { openTabs, setActiveTab, activeTabId, closeTab } = useEditorState();

  const pushLocalDataToServer = () => {
    const manager = getSyncManager();
    manager.pushLocalData().catch((error) => {
      console.error("Error pushing local data:", error);
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.username}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.username}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {openTabs.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {openTabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.draftId}
                      className={cn(
                        isTouchDevice && tab.draftId === activeTabId
                          ? "bg-accent"
                          : "",
                      )}
                      onClick={(e) => {
                        setActiveTab(tab.draftId);
                        e.preventDefault();
                      }}
                    >
                      <div className="group">
                        {tab.editable ? (
                          <PenLine />
                        ) : (
                          <div
                            onClick={(e) => {
                              if (!isTouchDevice) {
                                closeTab(tab.draftId);
                                e.stopPropagation();
                              }
                              e.preventDefault();
                            }}
                          >
                            <Eye className="group-hover:hidden" />
                            <X className="hidden group-hover:block" />
                          </div>
                        )}
                      </div>
                      {tab.title}
                      {isTouchDevice
                        ? !tab.editable && (
                            <div
                              className="ml-auto"
                              onClick={(e) => {
                                closeTab(tab.draftId);
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                            >
                              <X />
                            </div>
                          )
                        : tab.draftId === activeTabId && (
                            <Check className="ml-auto" />
                          )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => enterArchiveMode()}>
                <Archive />
                {i18nText[user.language].archived}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => pushLocalDataToServer()}>
              <CloudUpload />
              {i18nText[user.language].push}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    archived: "已归档",
    push: "上传",
  },
  [UserLangEnum.ENUS]: {
    archived: "Archived",
    push: "Push",
  },
};
