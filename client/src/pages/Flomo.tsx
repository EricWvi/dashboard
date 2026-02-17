import { FlomoLogo } from "@/components/flomo/icons";
import { useEffect, useState, useRef } from "react";
import { SyncManager } from "@/lib/flomo/sync-manager";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { useCardsInFolder } from "@/hooks/flomo/use-cards";
import { useFoldersInParent } from "@/hooks/flomo/use-folders";
import { RootFolderId } from "@/lib/flomo/model";

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
  const syncManagerRef = useRef<SyncManager | null>(null);

  // Fetch data from local database
  const { data: cards } = useCardsInFolder(RootFolderId);
  const { data: folders } = useFoldersInParent(RootFolderId);

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
    <div className="min-h-screen bg-white p-8 dark:bg-[#282828]">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
          Flomo
        </h1>

        <div className="mb-4 flex items-center gap-2">
          <div className={`size-2 rounded-full bg-blue-500`} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            "Syncing..."
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
