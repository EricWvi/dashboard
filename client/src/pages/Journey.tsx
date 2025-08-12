import {
  towatchColumns,
  watchedColumns,
} from "@/components/react-table/watch-columns";
import { DataTable } from "@/components/react-table/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatches, WatchStatus } from "@/hooks/use-watches";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { WatchingList } from "@/components/watching-list";

function WatchingTab() {
  const { data: watches } = useWatches(WatchStatus.WATCHING);
  return (
    watches && (
      <div>
        <WatchingList watches={watches} />
      </div>
    )
  );
}

function ToWatchTab() {
  const { data: watches } = useWatches(WatchStatus.PLAN_TO_WATCH);

  return (
    <DataTable
      data={watches ?? []}
      columns={towatchColumns}
      toolbar="towatch"
      isLoading={watches ? false : true} // Show loading state if data is not available
    />
  );
}

function WatchedTab() {
  const { data: watches } = useWatches(WatchStatus.COMPLETED);

  return (
    <DataTable
      data={watches ?? []}
      columns={watchedColumns}
      toolbar="watched"
      isLoading={watches ? false : true} // Show loading state if data is not available
    />
  );
}

export default function Journey() {
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
            Dive and Explore !
          </h2>
        </div>
      </div>
      <div className={`${isMobile ? "px-6" : ""}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`${isMobile ? "w-full" : ""}`}>
            <TabsTrigger value="watching" className="px-4">
              Watching
            </TabsTrigger>
            <TabsTrigger value="towatch" className="px-4">
              To Watch
            </TabsTrigger>
            <TabsTrigger value="watched" className="px-4">
              Watched
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div
        className={`${isMobile ? "min-h-0 flex-1 overflow-scroll pt-4 pb-10" : ""}`}
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
