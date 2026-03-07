import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useBookmarkedCards, useRecentCards } from "@/hooks/flomo/use-cards";
import { useBookmarkedFolders } from "@/hooks/flomo/use-folders";
import { useAppState } from "@/hooks/flomo/use-app-state";
import { useEditorState } from "@/hooks/use-editor-state";
import type { Card } from "@/lib/flomo/model";
import type { UserLang } from "@/lib/model";

const RECENT_CARDS_LIMIT = 8;

export function FlomoHome() {
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
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pt-12 pb-8">
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

        {/* Quick Access */}
        {hasBookmarks && (
          <section className="mt-8">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {i18nText[language].quickAccess}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {bookmarkedFolders?.map((folder) => (
                <button
                  key={folder.id}
                  className="bg-muted/50 hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
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
                  className="bg-muted/50 hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors"
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
          <section className="mt-8">
            <h2 className="text-foreground mb-3 text-lg font-semibold">
              {i18nText[language].recentlyUpdated}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentCards?.map((card) => (
                <button
                  key={card.id}
                  className="bg-muted/50 hover:bg-muted flex flex-col items-start gap-1 rounded-lg border px-3 pt-2.5 pb-3 text-left transition-colors"
                  onClick={() => openCard(card)}
                >
                  <div>
                    <span className="shrink-0 text-base">
                      {card.payload.emoji || "📄"}
                    </span>
                    <span className="text-foreground text-sm leading-snug font-medium">
                      {card.title}
                    </span>
                  </div>

                  <span className="text-muted-foreground text-xs">
                    {formatRelativeTime(card.updatedAt, language)}
                  </span>
                  {card.rawText && (
                    <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
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
