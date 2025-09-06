import {
  towatchColumns,
  watchedColumns,
} from "@/components/react-table/data-table-columns";
import { DataTable } from "@/components/react-table/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatches, WatchStatus } from "@/hooks/use-watches";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { WatchingList } from "@/components/watching-list";
import { Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DroppedList from "@/components/dropped-watch";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

function WatchingTab() {
  const isMobile = useIsMobile();
  const { data: watches } = useWatches(WatchStatus.WATCHING);
  return (
    <div className={`${isMobile ? "pt-2" : ""}`}>
      <WatchingList watches={watches ?? []} />
    </div>
  );
}

function ToWatchTab() {
  const isMobile = useIsMobile();
  const { data: watches, isPending } = useWatches(WatchStatus.PLAN_TO_WATCH);
  // compute default pageSize on mobile
  const defaultPageSize =
    window.innerWidth < 768
      ? Math.min(Math.floor((window.innerHeight - 336) / 50), 10)
      : 10;
  const [droppedDialogOpen, setDroppedDialogOpen] = useState(false);

  return (
    <div className="relative">
      <DataTable
        data={watches ?? []}
        columns={towatchColumns}
        toolbar="towatch"
        isPending={isPending}
        defaultPageSize={defaultPageSize}
      />
      <div
        className={`${isMobile ? "fixed bottom-18 left-6" : "absolute bottom-0 left-0"}`}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDroppedDialogOpen(true)}
        >
          <Package2 />
        </Button>
      </div>

      <Dialog open={droppedDialogOpen} onOpenChange={setDroppedDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>Dropped Watches</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <DroppedList />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WatchedTab() {
  const { data: watches, isPending } = useWatches(WatchStatus.COMPLETED);
  // compute default pageSize on mobile
  const defaultPageSize =
    window.innerWidth < 768
      ? Math.min(Math.floor((window.innerHeight - 336) / 50), 10)
      : 10;

  return (
    <DataTable
      data={watches ?? []}
      columns={watchedColumns}
      toolbar="watched"
      isPending={isPending}
      defaultPageSize={defaultPageSize}
    />
  );
}

export default function Journey() {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("watching");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["watching"]),
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => new Set([...prev, value]));
  };

  return (
    <div
      className={`flex size-full flex-col gap-4 ${isMobile ? "pt-6" : "p-8"}`}
    >
      <div
        className={`flex items-center justify-between gap-2 ${isMobile ? "px-6" : ""}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-semibold tracking-tight">
            {i18nText[language].diveAndExplore}
          </h2>
        </div>
      </div>
      <div className={`${isMobile ? "px-6" : ""}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`${isMobile ? "w-full" : ""}`}>
            <TabsTrigger value="watching" className="px-4">
              {i18nText[language].watching}
            </TabsTrigger>
            <TabsTrigger value="towatch" className="px-4">
              {i18nText[language].toWatch}
            </TabsTrigger>
            <TabsTrigger value="watched" className="px-4">
              {i18nText[language].watched}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div
        className={`${isMobile ? "min-h-0 flex-1 overflow-scroll pb-10" : ""}`}
      >
        {/* Watching Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "watching" ? "block" : "hidden"}`}>
          {visitedTabs.has("watching") && <WatchingTab />}
        </div>

        {/* ToWatch Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "towatch" ? "block" : "hidden"}`}>
          {visitedTabs.has("towatch") && <ToWatchTab />}
        </div>

        {/* Watched Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "watched" ? "block" : "hidden"}`}>
          {visitedTabs.has("watched") && <WatchedTab />}
        </div>
      </div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    diveAndExplore: "探索未知！",
    watching: "在看",
    toWatch: "想看",
    watched: "已看",
  },
  [UserLangEnum.ENUS]: {
    diveAndExplore: "Dive and Explore !",
    watching: "Watching",
    toWatch: "To Watch",
    watched: "Watched",
  },
};
