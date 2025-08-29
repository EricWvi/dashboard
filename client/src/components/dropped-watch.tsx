import { useRecoverWatch, useWatches, WatchStatus } from "@/hooks/use-watches";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { dateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function DroppedList() {
  const { data: watches, isLoading } = useWatches(WatchStatus.DROPPED);
  const recoverWatchMutation = useRecoverWatch();
  const [showLoading, setShowLoading] = useState(true);
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    }
  }, [isLoading]);

  return (
    <div className="aspect-[5/4] rounded-lg sm:aspect-[16/9]">
      {showLoading ? (
        <Skeleton className="size-full" />
      ) : (
        <div className="space-y-1 font-medium">
          {watches?.map((watch) => (
            <div
              key={watch.id}
              className="bg-card flex items-center justify-between rounded-sm border py-2 pr-2 pl-4 text-sm"
            >
              <div>
                {watch.type} · {watch.title}
                <span className="text-muted-foreground ml-1 text-xs">
                  {`(dropped on ${dateString(
                    watch.payload.checkpoints![
                      watch.payload.checkpoints!.length - 1
                    ][0],
                  )})`}
                </span>
              </div>
              <Button
                variant="ghost"
                className="size-4 xl:size-6"
                onClick={() => recoverWatchMutation.mutate(watch)}
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
