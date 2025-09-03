"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTTContext } from "@/components/editor";
import Todo from "@/pages/Todo";
import Dashboard from "@/pages/Dashboard";
import Journey from "@/pages/Journey";
import Echo from "@/pages/Echo";
import Blog from "@/pages/Blog";
import Bookmark from "@/pages/Bookmark";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BookmarkIcon,
  DashboardIcon,
  EchoIcon,
  JourneyIcon,
  TodoIcon,
} from "@/components/ui/icons";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { getSessionStatus, syncSessionStatus } from "@/hooks/use-user";

export default function TabbedApp() {
  const isMobile = useIsMobile();
  const [tabBarOpen, setTabBarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const activeTabRef = useRef("dashboard");
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["dashboard"]),
  );
  const { open } = useTTContext();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => new Set([...prev, value]));
  };

  usePageVisibility(() => {
    getSessionStatus().then(async (res) => {
      const data = await res.json();
      if (data.message.stale) {
        setVisitedTabs(new Set([activeTabRef.current]));
        syncSessionStatus();
      }
    });
  });

  return (
    <div
      className={`bg-background h-full w-full ${open ? "pointer-events-none touch-none" : ""}`}
    >
      {/* Desktop Tabs - Top Center with Hover Animation - Fixed Shadow Issue */}
      <div className="fixed top-0 left-1/2 z-50 hidden -translate-x-1/2 transform md:block">
        <div className="group">
          {/* Hover trigger area */}
          <div
            className="h-8 w-300 bg-transparent"
            onClick={() => {
              setTabBarOpen(true);
              setTimeout(() => {
                setTabBarOpen(false);
              }, 3000);
            }}
          />

          {/* Tabs container with animation - moved higher to hide shadow completely */}
          <div
            className={`absolute top-0 left-1/2 w-160 -translate-x-1/2 -translate-y-full transform transition-transform duration-300 ease-in-out group-hover:translate-y-0 ${tabBarOpen ? "translate-y-1/2" : ""}`}
          >
            <div className="bg-background/95 -translate-y-2 transform rounded-b-lg border-b shadow-md backdrop-blur-sm transition-transform duration-300 ease-in-out group-hover:translate-y-0">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid h-12 w-full grid-cols-6 bg-transparent">
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
                  <TabsTrigger
                    value="blog"
                    className="data-[state=active]:bg-accent flex items-center gap-2"
                  >
                    <span className="lg:inline">Blog</span>
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
          <TabsList className="flex h-14 w-full rounded-none bg-transparent px-4 pb-2">
            <TabsTrigger
              value="dashboard"
              className="h-10 gap-2 rounded-3xl !border-none !shadow-none data-[state=active]:bg-gray-100 data-[state=active]:!px-6 data-[state=active]:dark:!bg-[#2e2e2e]"
            >
              <DashboardIcon
                className={`size-6 ${activeTab === "dashboard" ? "" : "dark:text-muted-foreground text-gray-700"}`}
              />
              {activeTab === "dashboard" && <div className="">Dashboard</div>}
            </TabsTrigger>
            <TabsTrigger
              value="todo"
              className="h-10 gap-2 rounded-3xl !border-none !shadow-none data-[state=active]:bg-gray-100 data-[state=active]:!px-6 data-[state=active]:dark:!bg-[#2e2e2e]"
            >
              <TodoIcon
                className={`size-6 ${activeTab === "todo" ? "" : "dark:text-muted-foreground text-gray-700"}`}
              />
              {activeTab === "todo" && <div className="">Todo</div>}
            </TabsTrigger>
            <TabsTrigger
              value="journey"
              className="h-10 gap-2 rounded-3xl !border-none !shadow-none data-[state=active]:bg-gray-100 data-[state=active]:!px-6 data-[state=active]:dark:!bg-[#2e2e2e]"
            >
              <JourneyIcon
                className={`size-6 ${activeTab === "journey" ? "" : "dark:text-muted-foreground text-gray-700"}`}
              />
              {activeTab === "journey" && <div className="">Journey</div>}
            </TabsTrigger>
            <TabsTrigger
              value="bookmark"
              className="h-10 gap-2 rounded-3xl !border-none !shadow-none data-[state=active]:bg-gray-100 data-[state=active]:!px-6 data-[state=active]:dark:!bg-[#2e2e2e]"
            >
              <BookmarkIcon
                className={`size-6 ${activeTab === "bookmark" ? "" : "dark:text-muted-foreground text-gray-700"}`}
              />
              {activeTab === "bookmark" && <div className="">Bookmark</div>}
            </TabsTrigger>
            <TabsTrigger
              value="echo"
              className="h-10 gap-2 rounded-3xl !border-none !shadow-none data-[state=active]:bg-gray-100 data-[state=active]:!px-6 data-[state=active]:dark:!bg-[#2e2e2e]"
            >
              <EchoIcon
                className={`size-6 ${activeTab === "echo" ? "" : "dark:text-muted-foreground text-gray-700"}`}
              />
              {activeTab === "echo" && <div className="">Echo</div>}
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

        {/* Blog - lazy render but keep mounted */}
        <div
          className={`${activeTab === "blog" ? "block size-full" : "hidden"}`}
        >
          {visitedTabs.has("blog") && <Blog />}
        </div>
      </div>
    </div>
  );
}
