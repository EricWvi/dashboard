import { FlomoLogo } from "@/components/flomo/icons";
import { useEffect, useState, useRef } from "react";
import { SyncManager, type SyncProgress } from "@/lib/sync-manager";
import { flomoDatabase } from "@/lib/flomo-db";
import { useCardsInFolder } from "@/hooks/use-cards";
import { useFoldersInParent } from "@/hooks/use-folders";

// Create singleton sync manager
let syncManager: SyncManager | null = null;
function getSyncManager() {
  if (!syncManager) {
    syncManager = new SyncManager(flomoDatabase);
  }
  return syncManager;
}

export default function Flomo() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: "idle",
  });
  const syncManagerRef = useRef<SyncManager | null>(null);

  // Fetch data from local database
  const { data: cards } = useCardsInFolder(null);
  const { data: folders } = useFoldersInParent(null);

  useEffect(() => {
    const manager = getSyncManager();
    syncManagerRef.current = manager;

    // Subscribe to sync progress
    const unsubscribe = manager.subscribe((progress) => {
      setSyncProgress(progress);

      // Once full sync is complete, hide loading screen
      if (progress.status === "idle" && isInitializing) {
        setIsInitializing(false);
      }
    });

    // Perform full sync on mount
    const initSync = async () => {
      try {
        await manager.fullSync();
        // Start auto-sync every 30 seconds after full sync
        manager.startAutoSync(30000);
      } catch (error) {
        console.error("Initial sync failed:", error);
        // Still allow access to app even if sync fails
        setIsInitializing(false);
      }
    };

    initSync();

    return () => {
      unsubscribe();
      manager.stopAutoSync();
    };
  }, [isInitializing]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white dark:bg-[#282828]">
        <div className="size-24 sm:size-36">
          <FlomoLogo />
        </div>
        {syncProgress.status === "full-sync" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Syncing your notes...
          </p>
        )}
        {syncProgress.status === "error" && (
          <div className="text-center">
            <p className="text-sm text-red-500">Sync failed</p>
            <p className="text-xs text-gray-500">{syncProgress.error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 dark:bg-[#282828]">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Flomo
        </h1>

        <div className="mb-4 flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${
              syncProgress.status === "syncing" ||
              syncProgress.status === "push" ||
              syncProgress.status === "pull"
                ? "bg-blue-500"
                : syncProgress.status === "error"
                  ? "bg-red-500"
                  : "bg-green-500"
            }`}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {syncProgress.status === "syncing" && "Syncing..."}
            {syncProgress.status === "push" && "Uploading changes..."}
            {syncProgress.status === "pull" && "Downloading updates..."}
            {syncProgress.status === "error" && `Error: ${syncProgress.error}`}
            {syncProgress.status === "idle" &&
              syncProgress.lastSyncTime &&
              `Last synced: ${new Date(syncProgress.lastSyncTime).toLocaleTimeString()}`}
          </span>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Folders ({folders?.length ?? 0})
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {folders?.map((folder) => (
                <div key={folder.id} className="py-1">
                  📁 {folder.title}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Cards ({cards?.length ?? 0})
            </h2>
            <div className="space-y-2">
              {cards?.map((card) => (
                <div
                  key={card.id}
                  className="rounded border border-gray-200 p-3 dark:border-gray-700"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {card.rawText}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
