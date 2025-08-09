import { columns } from "@/components/react-table/watched-columns";
import { DataTable } from "@/components/react-table/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWatches, WatchStatus } from "@/hooks/use-watches";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

function ToWatchTab() {
  return <></>;
}

function WatchedTab() {
  const { data: watches } = useWatches(WatchStatus.COMPLETED);

  return <DataTable data={watches ?? []} columns={columns} />;
}

export default function Journey() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("towatch");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["towatch"]),
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => new Set([...prev, value]));
  };

  return (
    <div className={`flex flex-col gap-4 ${isMobile ? "pt-2" : "p-8"}`}>
      <div
        className={`flex items-center justify-between gap-2 ${isMobile ? "px-6" : ""}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-semibold tracking-tight">
            Dive and Explore!
          </h2>
        </div>
      </div>
      <div className={`${isMobile ? "px-6" : ""}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`${isMobile ? "w-full" : ""}`}>
            <TabsTrigger value="watching" className="flex items-center gap-2">
              Watching
            </TabsTrigger>
            <TabsTrigger value="towatch" className="flex items-center gap-2">
              To Watch
            </TabsTrigger>
            <TabsTrigger value="watched" className="flex items-center gap-2">
              Watched
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div>
        {/* Dashboard - lazy render but keep mounted */}
        {/* <div className={`${activeTab === "dashboard" ? "block" : "hidden"}`}>
                        {visitedTabs.has("dashboard") && <Dashboard />}
                      </div> */}

        {/* Todo - lazy render but keep mounted */}
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
