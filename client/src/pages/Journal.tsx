import { useEffect, useRef, useState } from "react";
import Header from "@/components/journal/header";
import EntryCard from "@/components/journal/entry-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  createEntry,
  EntryMeta,
  type QueryCondition,
  listEntries,
  useUpdateEntry,
  refreshMeta,
} from "@/hooks/use-entries";
import InfiniteScroll from "react-infinite-scroll-component";
import { useTTContext } from "@/components/editor";
import { useCloseActionContext } from "@/close-action-provider";
import type { Editor } from "@tiptap/react";
import { countWords } from "alfaaz";

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

export default function Journal() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scrollableDivRef = useRef<HTMLDivElement>(null);

  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();

  const [entries, setEntries] = useState<entryWrapper[]>([]);
  const conditionRef = useRef<QueryCondition[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const loading = useRef(false);

  const updateEntryMutation = useUpdateEntry();

  useEffect(() => {
    loadInitialData();
  }, []);

  const refresh = () => {
    setEntries([]);
    setPage(0);
    setHasMore(true);
    loadInitialData();
  };

  const loadInitialData = async () => {
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
  };

  const fetchMoreData = async (page: number) => {
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
  };

  const handleCreateEntry = async () => {
    createEntry().then(([id, draft]) => {
      setOnClose(() => (e: Editor) => {
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

        setOnClose(() => () => {});
      });
      setEditorId(draft);
      setEditorDialogOpen(true);
    });
  };

  const scrollToTop = () => {
    if (scrollableDivRef.current) {
      scrollableDivRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSearchToggle = () => {
    const queryWord = prompt("Enter search keyword:");
    if (queryWord !== null) {
      const trimmed = queryWord.trim();
      if (trimmed.length > 0) {
        conditionRef.current = [{ operator: "contains", value: trimmed }];
      } else {
        conditionRef.current = [];
      }
      scrollToTop();
      refresh();
    }
  };

  return (
    <div className="fixed inset-0">
      <div
        id="scrollableDiv"
        ref={scrollableDivRef}
        className="journal-bg scrollbar-hide h-full overflow-y-auto"
      >
        <Header
          onSearchToggle={onSearchToggle}
          onCalendarToggle={() => setCalendarOpen(!calendarOpen)}
        />
        <main className="w-full max-w-4xl">
          {/* Entries List */}
          <InfiniteScroll
            scrollableTarget="scrollableDiv"
            className="px-5 sm:px-7 lg:px-9"
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
                  <p className="mt-30">{"No entries yet."}</p>
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
              />
            ))}
          </InfiniteScroll>
        </main>

        {/* Floating Action Button */}
        <div className="fixed right-6 bottom-6 z-40">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-[hsl(207,90%,54%)] shadow-lg transition-all duration-200 hover:bg-[hsl(207,90%,48%)] hover:shadow-xl"
            onClick={handleCreateEntry}
          >
            <Plus className="text-xl" />
          </Button>
        </div>

        {/* Overlays and Modals */}
        {/* <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} /> */}
        {/* <CalendarOverlay
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          entries={entries}
        /> */}
      </div>
    </div>
  );
}
