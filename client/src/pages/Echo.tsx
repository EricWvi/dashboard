import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyRetro } from "@/components/weekly-retro";
import { AnnualRetro } from "@/components/annual-retro";
import { DecadeRetro } from "@/components/decade-retro";

export default function Echo() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("week");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["week"]),
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
          <h2 className="text-3xl font-semibold">Echoes</h2>
        </div>
      </div>

      <div className={`${isMobile ? "px-6" : ""}`}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className={`${isMobile ? "w-full" : ""}`}>
            <TabsTrigger value="week" className="px-4">
              Week
            </TabsTrigger>
            <TabsTrigger value="year" className="px-4">
              Year
            </TabsTrigger>
            <TabsTrigger value="decade" className="px-4">
              Decade
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div
        className={`${isMobile ? "min-h-0 flex-1 overflow-scroll px-8 pb-10" : "px-2"}`}
      >
        {/* Week Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "week" ? "block" : "hidden"}`}>
          {visitedTabs.has("week") && <WeeklyRetro />}
        </div>

        {/* Year Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "year" ? "block" : "hidden"}`}>
          {visitedTabs.has("year") && <AnnualRetro />}
        </div>

        {/* Decade Tab - lazy render but keep mounted */}
        <div className={`${activeTab === "decade" ? "block" : "hidden"}`}>
          {visitedTabs.has("decade") && <DecadeRetro />}
        </div>
      </div>
    </div>
  );
}
