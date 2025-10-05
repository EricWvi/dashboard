import {
  useRecoverWatch,
  useWatches,
  WatchStatus,
  WatchTypeText,
} from "@/hooks/use-watches";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { dateString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useUserContext } from "@/user-provider";
import { UserLangEnum } from "@/hooks/use-user";
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";

export default function DroppedList() {
  const { language } = useUserContext();
  const { data: watches, isPending } = useWatches(WatchStatus.DROPPED);
  const recoverWatchMutation = useRecoverWatch();
  const [showLoading, setShowLoading] = useState(true);
  useEffect(() => {
    if (!isPending) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    } else {
      setShowLoading(true);
    }
  }, [isPending]);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [currentReviewId, setCurrentReviewId] = useState(0);
  const handleOpenReview = (review: number) => {
    setCurrentReviewId(review);
    setReviewDialogOpen(true);
  };

  return (
    <div className="aspect-[2/3] min-w-0 overflow-scroll sm:aspect-square">
      {showLoading ? (
        <Skeleton className="size-full" />
      ) : (
        <div className="space-y-1 font-medium">
          {watches?.map((watch) => (
            <div
              key={watch.id}
              className="bg-card flex items-center justify-between gap-1 rounded-sm border py-2 pr-2 pl-4 text-sm"
            >
              <div className="min-w-0">
                {WatchTypeText[watch.type][language]}
                {" · "}
                {!!watch.payload.review ? (
                  <span
                    className="dashed-text cursor-pointer"
                    onClick={() => handleOpenReview(watch.payload.review!)}
                  >
                    {watch.title}
                  </span>
                ) : (
                  <span>{watch.title}</span>
                )}

                <span className="text-muted-foreground ml-1 text-xs">
                  {`(${i18nText[language].dropOn} ${dateString(
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

              <Dialog
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
              >
                <DialogContent
                  className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
                  onOpenAutoFocus={(e) => {
                    e.preventDefault(); // stops Radix from focusing anything
                    (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>{watch.title}</DialogTitle>
                    <DialogDescription></DialogDescription>
                  </DialogHeader>
                  <ContentHtml id={currentReviewId} />
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    dropOn: "放弃于",
  },
  [UserLangEnum.ENUS]: {
    dropOn: "dropped on",
  },
};
