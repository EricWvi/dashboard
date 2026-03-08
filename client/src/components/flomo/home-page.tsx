import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useBookmarkedCards, useRecentCards } from "@/hooks/flomo/use-cards";
import { useBookmarkedFolders } from "@/hooks/flomo/use-folders";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useEditorState } from "@/hooks/use-editor-state";
import type { Card } from "@/lib/flomo/model";
import type { UserLang } from "@/lib/model";
import { useIsMobile } from "@/hooks/use-mobile";
import { FlomoLogo, FlomoText } from "./icons";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const RECENT_CARDS_LIMIT = 8;

const AppHeader = () => {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="flex h-16 w-full items-center pr-6 pl-4">
      <div className="flex items-center" onClick={() => toggleSidebar()}>
        <div className="size-12 rounded-lg">
          <FlomoLogo />
        </div>
        <div className="fill-foreground h-6">
          <FlomoText />
        </div>
      </div>
      <Button role="icon" className="ml-auto">
        <Plus />
      </Button>
    </div>
  );
};

export function FlomoHome() {
  const isMobile = useIsMobile();
  const { language } = useUserContextV2();
  const { data: bookmarkedCards } = useBookmarkedCards();
  const { data: bookmarkedFolders } = useBookmarkedFolders();
  const { data: recentCards } = useRecentCards(RECENT_CARDS_LIMIT);
  const { setCurrentFolderId, setCardIdForDraft } = useAppState();
  const { openTab } = useEditorState();

  const openCard = (card: Card) => {
    openTab({
      draftId: card.draft,
      title: card.title,
      editable: false,
    });
    setCardIdForDraft(card.draft, card.id);
    setCurrentFolderId(card.folderId);
  };

  const openFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const hasBookmarks =
    (bookmarkedFolders && bookmarkedFolders.length > 0) ||
    (bookmarkedCards && bookmarkedCards.length > 0);
  const hasRecent = recentCards && recentCards.length > 0;

  return (
    <div className="flex h-full flex-col items-center">
      {isMobile && <AppHeader />}
      <div className="flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-6 pt-4 sm:pt-40">
        {/* Search */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder={i18nText[language].searchPlaceholder}
              readOnly
            />
          </div>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-8 overflow-y-auto pb-10">
          {/* Quick Access */}
          {hasBookmarks && (
            <section>
              <h2 className="text-foreground mb-3 text-lg font-semibold">
                {i18nText[language].quickAccess}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-5">
                {bookmarkedFolders?.map((folder) => (
                  <button
                    key={folder.id}
                    className="bg-muted/50 hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
                    onClick={() => openFolder(folder.id)}
                  >
                    <span className="shrink-0 text-base">
                      {folder.payload.emoji || "📂"}
                    </span>
                    <span className="text-foreground truncate text-sm font-medium">
                      {folder.title}
                    </span>
                  </button>
                ))}
                {bookmarkedCards?.map((card) => (
                  <button
                    key={card.id}
                    className="bg-muted/50 hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
                    onClick={() => openCard(card)}
                  >
                    <span className="shrink-0 text-base">
                      {card.payload.emoji || "📄"}
                    </span>
                    <span className="text-foreground truncate text-sm font-medium">
                      {card.title}
                      <span className="text-muted-foreground text-xs">.tt</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Recently Updated */}
          {hasRecent && (
            <section>
              <h2 className="text-foreground mb-3 text-lg font-semibold">
                {i18nText[language].recentlyUpdated}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {recentCards?.map((card) => (
                  <button
                    key={card.id}
                    className="bg-muted/50 hover:bg-muted flex cursor-pointer flex-col items-start gap-1 rounded-lg border px-3 pt-2.5 pb-3 text-left transition-colors"
                    onClick={() => openCard(card)}
                  >
                    <div className="flex w-full min-w-0 items-center gap-2">
                      <span className="shrink-0 text-base">
                        {card.payload.emoji || "📄"}
                      </span>
                      <span className="text-foreground truncate text-sm font-medium">
                        {card.title}
                        <span className="text-muted-foreground text-xs">
                          .tt
                        </span>
                      </span>
                    </div>

                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(card.updatedAt, language)}
                    </span>
                    {card.rawText && (
                      <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-tight">
                        {card.rawText}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number, language: UserLang): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isZh = language === UserLangEnum.ZHCN;

  if (minutes < 1) return isZh ? "刚刚" : "just now";
  if (minutes < 60) return isZh ? `${minutes} 分钟前` : `${minutes}m ago`;
  if (hours < 24) return isZh ? `${hours} 小时前` : `${hours}h ago`;
  if (days < 30) return isZh ? `${days} 天前` : `${days}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(language, {
    month: "short",
    day: "numeric",
  });
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    searchPlaceholder: "搜索所有笔记...",
    quickAccess: "快速访问",
    recentlyUpdated: "最近更新",
  },
  [UserLangEnum.ENUS]: {
    searchPlaceholder: "Search all notes...",
    quickAccess: "Quick Access",
    recentlyUpdated: "Recently Updated",
  },
};
