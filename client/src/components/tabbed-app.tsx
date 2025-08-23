"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Home } from "lucide-react";
import { useTTContext } from "@/components/editor";
import Todo from "@/pages/Todo";
import Dashboard from "@/pages/Dashboard";
import Journey from "@/pages/Journey";
import Echo from "@/pages/Echo";
import Bookmark from "@/pages/Bookmark";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TabbedApp() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["dashboard"]),
  );
  const { open } = useTTContext();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => new Set([...prev, value]));
  };

  return (
    <div
      className={`bg-background h-full w-full ${open ? "pointer-events-none touch-none" : ""}`}
    >
      {/* Desktop Tabs - Top Center with Hover Animation - Fixed Shadow Issue */}
      <div className="fixed top-0 left-1/2 z-50 hidden -translate-x-1/2 transform md:block">
        <div className="group">
          {/* Hover trigger area */}
          <div className="h-8 w-256 bg-transparent" />

          {/* Tabs container with animation - moved higher to hide shadow completely */}
          <div className="absolute top-0 left-1/2 w-108 -translate-x-1/2 -translate-y-full transform transition-transform duration-300 ease-in-out group-hover:translate-y-0">
            <div className="bg-background/95 -translate-y-2 transform rounded-b-lg border-b shadow-md backdrop-blur-sm transition-transform duration-300 ease-in-out group-hover:translate-y-0">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid h-12 w-full grid-cols-5 bg-transparent">
                  <TabsTrigger
                    value="dashboard"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="todo"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Todo</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="journey"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Journey</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookmark"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Bookmark</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="echo"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Echo</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Bottom Fixed */}
      <div className="bg-background/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-sm md:hidden">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid h-14 w-full grid-cols-5 rounded-none bg-transparent">
            <TabsTrigger value="dashboard" className="h-full rounded-full">
              <Home className="size-6" />
            </TabsTrigger>
            <TabsTrigger value="todo" className="h-full rounded-full">
              <CheckCircle2 className="size-6" />
            </TabsTrigger>
            <TabsTrigger value="journey" className="h-full rounded-full">
              <CheckCircle2 className="size-6" />
            </TabsTrigger>
            <TabsTrigger value="bookmark" className="h-full rounded-full">
              <CheckCircle2 className="size-6" />
            </TabsTrigger>
            <TabsTrigger value="echo" className="h-full rounded-full">
              <CheckCircle2 className="size-6" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div
        className={`${isMobile ? "fixed top-2 bottom-14 w-full" : "h-full w-full py-6"}`}
      >
        {/* Dashboard - lazy render but keep mounted */}
        <div
          className={`${activeTab === "dashboard" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("dashboard") && <Dashboard />}
        </div>

        {/* Todo - lazy render but keep mounted */}
        <div
          className={`${activeTab === "todo" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("todo") && <Todo />}
        </div>

        {/* Journey - lazy render but keep mounted */}
        <div
          className={`${activeTab === "journey" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("journey") && <Journey />}
        </div>

        {/* Bookmark - lazy render but keep mounted */}
        <div
          className={`${activeTab === "bookmark" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("bookmark") && <Bookmark />}
        </div>

        {/* Echo - lazy render but keep mounted */}
        <div
          className={`${activeTab === "echo" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("echo") && <Echo />}
        </div>
      </div>
    </div>
  );
}
