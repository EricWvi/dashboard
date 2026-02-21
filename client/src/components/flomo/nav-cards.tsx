import { Folder, MoreHorizontal, Share, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useCardsInFolder } from "@/hooks/flomo/use-cards";

interface NavCardsProps {
  currentFolderId: string;
}

export function NavCards({ currentFolderId }: NavCardsProps) {
  const { isMobile } = useSidebar();
  const { language } = useUserContextV2();

  const { data: cards } = useCardsInFolder(currentFolderId);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{i18nText[language].cards}</SidebarGroupLabel>
      <SidebarMenu>
        {cards
          ?.sort((a, b) => b.createdAt - a.createdAt)
          .map((card) => (
            <SidebarMenuItem key={card.id} className="cursor-pointer">
              <SidebarMenuButton asChild>
                <div>
                  <span>📄</span>
                  <span>{card.title}</span>
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
                    <span>View Card</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="text-muted-foreground" />
                    <span>Share Card</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Card</span>
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
    cards: "卡片",
  },
  [UserLangEnum.ENUS]: {
    cards: "Cards",
  },
};
