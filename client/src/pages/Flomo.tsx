import { FlomoLogo } from "@/components/flomo/icons";
import { useEffect, useState, useRef } from "react";
import { SyncManager, getSyncManager } from "@/lib/flomo/sync-manager";
import { AppSidebar } from "@/components/flomo/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CardContent } from "@/components/flomo/card-content";
import { ArchiveFrame } from "@/components/flomo/archive-decoration";
import { useAppState } from "@/hooks/flomo/use-app-state";

export default function Flomo() {
  const [isInitializing, setIsInitializing] = useState(true);
  const syncManagerRef = useRef<SyncManager | null>(null);

  useEffect(() => {
    const manager = getSyncManager();
    syncManagerRef.current = manager;

    const initSync = async () => {
      if (await manager.needFullSync()) {
        // First time use - perform full sync
        console.log("performing full sync");
        manager.fullSync().then(() => {
          setTimeout(() => {
            manager.startAutoSync();
          }, 5000); // Start auto sync after 5 seconds
          setIsInitializing(false);
        });
      } else {
        manager.startAutoSync();
        setTimeout(() => {
          setIsInitializing(false);
        }, 500);
      }
    };

    initSync();

    return () => {
      manager.stopAutoSync();
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-[#282828]">
        <div className="size-24 sm:size-36">
          <FlomoLogo />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <CardContent />
        </SidebarInset>
      </SidebarProvider>
      <FlomoArchiveFrame />
    </div>
  );
}

function FlomoArchiveFrame() {
  const { isArchiveMode } = useAppState();
  if (!isArchiveMode) return null;
  return <ArchiveFrame />;
}
