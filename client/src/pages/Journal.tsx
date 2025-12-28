import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/journal/header";
import EntryCard from "@/components/journal/entry-card";
import { X } from "lucide-react";
import {
  createEntry,
  EntryMeta,
  type QueryCondition,
  listEntries,
  useUpdateEntry,
  refreshMeta,
  deleteEntry,
} from "@/hooks/use-entries";
import ShareCard from "@/components/journal/share-card";
import InfiniteScroll from "react-infinite-scroll-component";
import { useTTContext } from "@/components/editor";
import { useCloseActionContext } from "@/close-action-provider";
import type { Editor } from "@tiptap/react";
import { countWords } from "alfaaz";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";
import {
  Plus,
  TextQuote,
  BookmarkSquare,
  NumberSquare,
  DecreaseCircle,
  Sparkles,
  Calendar31,
} from "@/components/journal/icon";

type entryWrapper = {
  entry: EntryMeta;
  showYear: boolean;
  showMonth: boolean;
  showToday: boolean;
  showYesterday: boolean;
};

const buildWrapper = (
  currWrappers: entryWrapper[],
  metas: EntryMeta[],
): entryWrapper[] => {
  const newWrappers = metas.map((entry, idx, arr) => {
    let prev = arr[idx - 1];
    if (idx === 0 && currWrappers.length > 0) {
      prev = currWrappers[currWrappers.length - 1].entry;
    }

    if (entry.isToday() || entry.isYesterday()) {
      const showToday = entry.isToday() && !prev;
      const showYesterday =
        entry.isYesterday() && (!prev || entry.day !== prev.day);
      return {
        entry,
        showYear: false,
        showMonth: false,
        showToday,
        showYesterday,
      };
    } else {
      const showYear = entry.year !== new Date().getFullYear();
      const showMonth =
        !prev ||
        entry.year !== prev.year ||
        entry.month !== prev.month ||
        prev.isToday() ||
        prev.isYesterday();
      return {
        entry,
        showYear,
        showMonth,
        showToday: false,
        showYesterday: false,
      };
    }
  });

  return [...currWrappers, ...newWrappers];
};

// Conditions Component
interface ConditionsProps {
  conditions: QueryCondition[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
}

const getConditionIcon = (operator: string) => {
  switch (operator) {
    case "random":
      return (
        <div className="size-4">
          <Sparkles />
        </div>
      );
    case "todays":
      return (
        <div className="size-4">
          <Calendar31 />
        </div>
      );
    case "contains":
      return (
        <div className="size-3">
          <TextQuote />
        </div>
      );
    case "bookmarked":
      return (
        <div className="size-3">
          <BookmarkSquare />
        </div>
      );
    case "on":
      return (
        <div className="size-3">
          <NumberSquare />
        </div>
      );
    case "before":
      return null;
    default:
      return null;
  }
};

const Conditions = React.memo(
  ({ conditions, onRemove, onClearAll }: ConditionsProps) => {
    const { language } = useUserContext();
    if (conditions.length === 0) return null;

    return (
      <div className="mx-auto mt-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 sm:mb-4">
          <span className="entry-card-shadow bg-entry-card text-foreground mr-1 rounded-full p-1.5 md:mr-2">
            <div className="size-5">
              <DecreaseCircle />
            </div>
          </span>
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="group entry-filter-shadow bg-entry-card flex items-center gap-1 rounded-full py-1.5 pr-3 pl-4"
            >
              <span className="text-foreground flex items-center gap-1 text-sm font-medium">
                {getConditionIcon(condition.operator)}

                {condition.operator === "before" && "<= "}
                {condition.value}
              </span>
              <button
                onClick={() => onRemove(index)}
                className="text-muted-foreground hover:text-foreground flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Remove filter"
              >
                <X className="h-3.5 w-3.5 cursor-pointer" />
              </button>
            </div>
          ))}
          {conditions.length > 1 && (
            <button
              onClick={onClearAll}
              className="text-muted-foreground hover:text-foreground ml-3 cursor-pointer text-sm font-medium transition-colors hover:underline"
            >
              {i18nText[language].clearAll}
            </button>
          )}
        </div>
      </div>
    );
  },
);

export default function Journal() {
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();
  const { language } = useUserContext();

  const [entries, setEntries] = useState<entryWrapper[]>([]);
  const conditionRef = useRef<QueryCondition[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loading = useRef(false);
  const [shareMeta, setShareMeta] = useState<EntryMeta>({} as EntryMeta);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const updateEntryMutation = useUpdateEntry();

  useEffect(() => {
    loadInitialData();
  }, []);

  const refresh = useCallback(() => {
    setEntries([]);
    setPage(0);
    setHasMore(true);
    loadInitialData();
  }, []);

  const loadInitialData = useCallback(async () => {
    loading.current = true;
    try {
      const [metas, more] = await listEntries(1, conditionRef.current);
      setEntries(buildWrapper([], metas));
      setHasMore(more);
      setPage(2);
    } catch (err) {
      console.error("Error loading initial data:", err);
    } finally {
      loading.current = false;
    }
  }, []);

  const fetchMoreData = useCallback(async (page: number) => {
    if (loading.current) return;
    loading.current = true;
    try {
      const [metas, hasMore] = await listEntries(page, conditionRef.current);
      setEntries((prev) => buildWrapper(prev, metas));
      setHasMore(hasMore);
      setPage((prev) => prev + 1);
    } catch (err) {
      console.error("Error fetching more data:", err);
    } finally {
      loading.current = false;
    }
  }, []);

  const handleCreateEntry = useCallback(async () => {
    createEntry().then(([id, draft]) => {
      setOnClose(() => (e: Editor, changed: boolean) => {
        if (changed) {
          const str = e.getText();
          updateEntryMutation
            .mutateAsync({
              id,
              wordCount: countWords(str),
              rawText: str.trim().replace(/\s+/g, " "),
            })
            .then(() => {
              refreshMeta();
              refresh();
            });
        } else {
          refreshMeta();
          refresh();
        }

        setOnClose(() => () => {});
      });
      setEditorId(draft);
      setEditorDialogOpen(true);
    });
  }, []);

  const handleDeleteEntry = useCallback(async (id: number) => {
    deleteEntry(id).then(() => {
      refreshMeta();
      refresh();
    });
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const onSearch = useCallback((queryWord: string) => {
    removeShuffle();
    if (queryWord !== null) {
      const trimmed = queryWord.trim();
      if (trimmed.length > 0) {
        const existingContainsIndex = conditionRef.current.findIndex(
          (condition) => condition.operator === "contains",
        );

        if (existingContainsIndex !== -1) {
          const newConditions = [...conditionRef.current];
          newConditions[existingContainsIndex] = {
            operator: "contains",
            value: trimmed,
          };
          conditionRef.current = newConditions;
        } else {
          const newConditions = [...conditionRef.current];
          newConditions.push({ operator: "contains", value: trimmed });
          conditionRef.current = newConditions;
        }
      } else {
        conditionRef.current = conditionRef.current.filter(
          (condition) => condition.operator !== "contains",
        );
      }
      scrollToTop();
      refresh();
    }
  }, []);

  const onBookmarkFilter = useCallback(() => {
    removeShuffle();
    const existingBookmarkIndex = conditionRef.current.findIndex(
      (condition) => condition.operator === "bookmarked",
    );

    if (existingBookmarkIndex === -1) {
      const label = language === UserLangEnum.ZHCN ? "书签" : "Bookmark";
      const newConditions = [...conditionRef.current];
      newConditions.push({ operator: "bookmarked", value: label });
      conditionRef.current = newConditions;
      scrollToTop();
      refresh();
    }
  }, []);

  const onShuffle = useCallback(() => {
    const label = language === UserLangEnum.ZHCN ? "随机" : "Shuffle";
    conditionRef.current = [{ operator: "random", value: label }];
    scrollToTop();
    refresh();
  }, []);

  const removeShuffle = useCallback(() => {
    conditionRef.current = conditionRef.current.filter(
      (condition) => condition.operator !== "random",
    );
  }, []);

  const onTodays = useCallback(() => {
    removeShuffle();
    const existingTodaysIndex = conditionRef.current.findIndex(
      (condition) => condition.operator === "todays",
    );

    if (existingTodaysIndex === -1) {
      const label = language === UserLangEnum.ZHCN ? "历史今天" : "Todays";
      const newConditions = [...conditionRef.current];
      newConditions.push({ operator: "todays", value: label });
      conditionRef.current = newConditions;
      scrollToTop();
      refresh();
    }
  }, []);

  const onDateFilter = useCallback((date: string) => {
    removeShuffle();
    // Remove any existing date filter first
    conditionRef.current = conditionRef.current.filter(
      (condition) =>
        condition.operator !== "on" && condition.operator !== "before",
    );

    // Add the new date filter
    conditionRef.current.push({ operator: "on", value: date });
    scrollToTop();
    refresh();
  }, []);

  const onDateRangeFilter = useCallback((date: string) => {
    removeShuffle();
    // Remove any existing date filter first
    conditionRef.current = conditionRef.current.filter(
      (condition) =>
        condition.operator !== "on" && condition.operator !== "before",
    );

    // Add the new date filter
    conditionRef.current.push({ operator: "before", value: date });
    scrollToTop();
    refresh();
  }, []);

  const dateRangeText = useCallback(() => {
    let index = conditionRef.current.findIndex(
      (condition) => condition.operator === "before",
    );
    if (index !== -1) {
      return ["before", conditionRef.current[index].value];
    }

    index = conditionRef.current.findIndex(
      (condition) => condition.operator === "on",
    );
    if (index !== -1) {
      return ["on", conditionRef.current[index].value];
    }

    return [];
  }, []);

  const handleRemoveCondition = useCallback(
    (index: number) => {
      const newConditions = [...conditionRef.current];
      newConditions.splice(index, 1);
      conditionRef.current = newConditions;
      refresh();
    },
    [refresh],
  );

  const handleClearAllConditions = useCallback(() => {
    conditionRef.current = [];
    scrollToTop();
    refresh();
  }, [scrollToTop, refresh]);

  const handleEntryCardShare = useCallback((meta: EntryMeta) => {
    setShareMeta(meta);
    setShareDialogOpen(true);
  }, []);

  return (
    <>
      <div className="journal-bg fixed inset-0 z-1"></div>
      <div className="fixed inset-0 z-2">
        <div className="h-full">
          <div
            id="scrollableDiv"
            ref={scrollableDivRef}
            className="h-full overflow-y-auto"
          >
            <div className="mx-auto max-w-3xl">
              <Header
                dateRangeText={dateRangeText}
                scrollToTop={scrollToTop}
                onSearch={onSearch}
                onBookmarkFilter={onBookmarkFilter}
                onShuffle={onShuffle}
                onTodays={onTodays}
                onDateFilter={onDateFilter}
                onDateRangeFilter={onDateRangeFilter}
              />

              {/* Conditions */}
              <Conditions
                conditions={conditionRef.current}
                onRemove={handleRemoveCondition}
                onClearAll={handleClearAllConditions}
              />

              <main className="w-full">
                {/* Entries List */}
                <InfiniteScroll
                  scrollableTarget="scrollableDiv"
                  className="px-4 sm:px-6 lg:px-8"
                  dataLength={entries.length}
                  next={() => fetchMoreData(page)}
                  hasMore={hasMore}
                  loader={
                    <div
                      className={`${entries.length === 0 ? "mt-12" : "mt-4"} space-y-4`}
                    >
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="entry-card-shadow bg-entry-card animate-pulse rounded-lg p-5"
                        >
                          <div className="mb-4 h-6 rounded bg-gray-200 dark:bg-gray-800"></div>
                          <div className="mb-2 h-4 rounded bg-gray-200 dark:bg-gray-800"></div>
                          <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
                        </div>
                      ))}
                    </div>
                  }
                  endMessage={
                    <div className="py-12 text-center text-lg text-[hsl(215,4%,56%)]">
                      {entries.length === 0 ? (
                        <p className="mt-30">{i18nText[language].noEntries}</p>
                      ) : (
                        <p>{"- end -"}</p>
                      )}
                    </div>
                  }
                >
                  {/* Entry Cards */}
                  {entries.map((e) => (
                    <EntryCard
                      key={e.entry.id}
                      meta={e.entry}
                      showYear={e.showYear}
                      showMonth={e.showMonth}
                      showToday={e.showToday}
                      showYesterday={e.showYesterday}
                      onShare={handleEntryCardShare}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                </InfiniteScroll>
              </main>

              {/* Add Entry Button */}
              <div className="floating-backdrop pointer-events-none fixed right-0 bottom-0 left-0 z-20 h-40 lg:hidden"></div>
              <div className="fixed right-1/2 bottom-6 z-40 translate-x-1/2 lg:right-6 lg:translate-x-0">
                <button
                  className="bg-add-entry-button add-entry-button-shadow flex size-18 cursor-pointer items-center justify-center rounded-full"
                  onClick={handleCreateEntry}
                >
                  <div className="text-add-entry-plus size-[22px]">
                    <Plus />
                  </div>
                </button>
              </div>

              {/* Share Dialog */}
              {shareDialogOpen && (
                <ShareCard
                  meta={shareMeta}
                  onClose={() => setShareDialogOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    noEntries: "暂无手记",
    clearAll: "清除过滤项",
  },
  [UserLangEnum.ENUS]: {
    noEntries: "No entries yet.",
    clearAll: "Clear filters",
  },
};
