"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Home } from "lucide-react";
import Todo from "@/pages/Todo";
import Dashboard from "@/pages/Dashboard";

export default function TabbedApp() {
  const [activeTab, setActiveTab] = useState("todo");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set(["todo"]),
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setVisitedTabs((prev) => new Set([...prev, value]));
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Tabs - Top Center with Hover Animation - Fixed Shadow Issue */}
      <div className="fixed top-0 left-1/2 z-50 hidden -translate-x-1/2 transform md:block">
        <div className="group">
          {/* Hover trigger area */}
          <div className="h-8 w-96 bg-transparent" />

          {/* Tabs container with animation - moved higher to hide shadow completely */}
          <div className="absolute top-0 left-0 w-full -translate-y-full transform transition-transform duration-300 ease-in-out group-hover:translate-y-0">
            <div className="bg-background/95 -translate-y-2 transform rounded-b-lg border-b shadow-lg backdrop-blur-sm transition-transform duration-300 ease-in-out group-hover:translate-y-0">
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full"
              >
                <TabsList className="grid h-12 w-full grid-cols-4 bg-transparent">
                  <TabsTrigger
                    value="dashboard"
                    className="flex items-center gap-2"
                  >
                    <span className="lg:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="todo" className="flex items-center gap-2">
                    <span className="lg:inline">Todo</span>
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
          <TabsList className="grid h-16 w-full grid-cols-4 rounded-none bg-transparent">
            <TabsTrigger
              value="dashboard"
              className="flex h-full flex-col items-center gap-1"
            >
              <Home className="h-5 w-5" />
            </TabsTrigger>
            <TabsTrigger
              value="todo"
              className="flex h-full flex-col items-center gap-1"
            >
              <CheckCircle2 className="h-5 w-5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Lazy rendered but persistent */}
      <div className="pt-6 pb-20 md:pb-6">
        {/* Dashboard - lazy render but keep mounted */}
        <div className={`${activeTab === "dashboard" ? "block" : "hidden"}`}>
          {visitedTabs.has("dashboard") && <Dashboard />}
        </div>

        {/* Todo - lazy render but keep mounted */}
        <div className={`${activeTab === "todo" ? "block" : "hidden"}`}>
          {visitedTabs.has("todo") && <Todo />}
        </div>
      </div>
    </div>
  );
}
