import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContextV2 } from "@/user-provider";
import { useFoldersInParent } from "@/hooks/flomo/use-folders";
import { Folder, MoreHorizontal, Share, Trash2 } from "lucide-react";
import { useAppState } from "@/hooks/flomo/use-app-state";

interface NavFoldersProps {
  currentFolderId: string;
}

export function NavFolders({ currentFolderId }: NavFoldersProps) {
  const { language } = useUserContextV2();
  const { isMobile } = useSidebar();
  const { data: folders } = useFoldersInParent(currentFolderId);
  const { setCurrentFolderId } = useAppState();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{i18nText[language].folders}</SidebarGroupLabel>
      <SidebarMenu>
        {folders
          ?.sort((a, b) => a.title.localeCompare(b.title))
          .map((folder) => (
            <SidebarMenuItem key={folder.id} className="cursor-pointer">
              <SidebarMenuButton
                asChild
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <div>
                  <span>📂</span>
                  <span>{folder.title}</span>
                </div>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>View Folder</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="text-muted-foreground" />
                    <span>Share Folder</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Folder</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    folders: "文件夹",
  },
  [UserLangEnum.ENUS]: {
    folders: "Folders",
  },
};
