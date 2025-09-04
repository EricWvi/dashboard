import { Button } from "@/components/tiptap-ui-primitive/button/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Button as UIButton } from "@/components/ui/button";
import { History } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReadOnlyTiptap } from "./simple-editor";
import { dateString } from "@/lib/utils";
import {
  getHistory,
  invalidateDraftQuery,
  listHistory,
  restoreHistory,
} from "@/hooks/use-draft";
import { RestoreIcon } from "@/components/tiptap-icons/restore-icon";

export const HistoryPopover = ({ id }: { id: number }) => {
  const [history, setHistory] = useState<number[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restoreHistoryDialogOpen, setRestoreHistoryDialogOpen] =
    useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);

  const fetchHistory = async () => {
    if (id === 0) return;

    setIsFetching(true);
    listHistory(id)
      .then(async (res) => {
        const data = await res.json();
        setHistory(data.message.history as number[]);
      })
      .finally(() => setIsFetching(false));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchHistory();
    }
  };

  const handleHistoryClick = (timestamp: number) => {
    setSelectedTimestamp(timestamp);
    setDialogOpen(true);
  };

  const handleRestore = () => {
    setRestoreHistoryDialogOpen(true);
  };

  const getVersionNumber = (timestamp: number) => {
    const index = history.indexOf(timestamp);
    return history.length - index;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button data-style="ghost" data-tooltip="History">
            <History className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 gap-2">
          <SheetHeader>
            <SheetTitle>Document History</SheetTitle>
            <SheetDescription></SheetDescription>
          </SheetHeader>
          <div>
            {isFetching ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto px-4">
                {history.map((timestamp, index) => (
                  <div
                    key={timestamp}
                    className="hover:bg-muted cursor-pointer rounded-md border p-3 text-sm"
                    onClick={() => handleHistoryClick(timestamp)}
                  >
                    <div className="font-medium">
                      Version {history.length - index}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {`${dateString(new Date(timestamp))} · ${new Date(timestamp).toLocaleTimeString()}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground px-4 text-sm">
                No history available
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-left">
              <div className="relative">
                {`Version ${getVersionNumber(selectedTimestamp)} `}
                <span className="text-muted-foreground text-sm">
                  {`(${dateString(new Date(selectedTimestamp))} · ${new Date(selectedTimestamp).toLocaleTimeString()})`}
                </span>

                <UIButton
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground absolute top-1/2 right-2 h-6 translate-x-1/2 -translate-y-1/2"
                  onClick={handleRestore}
                >
                  <RestoreIcon />
                </UIButton>
              </div>
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <HistoryContent id={id} ts={selectedTimestamp} />
        </DialogContent>
      </Dialog>

      {/* restore history confirmation dialog */}
      <AlertDialog
        open={restoreHistoryDialogOpen}
        onOpenChange={setRestoreHistoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore History</AlertDialogTitle>
            <AlertDialogDescription className="wrap-anywhere">
              Are you sure you want to restore this version? <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                restoreHistory(id, selectedTimestamp).then(() =>
                  invalidateDraftQuery(id),
                );
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export function HistoryContent({ id, ts }: { id: number; ts: number }) {
  const isMobile = useIsMobile();
  const [content, setContent] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [showLoading, setShowLoading] = useState(true);

  const fetchHistoryContent = async () => {
    setIsFetching(true);
    getHistory(id, ts)
      .then(async (res) => {
        const data = await res.json();
        setContent(data.message.content);
      })
      .finally(() => setIsFetching(false));
  };

  useEffect(() => {
    fetchHistoryContent();
  }, [id, ts]);

  useEffect(() => {
    if (!isFetching) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    } else {
      setShowLoading(true);
    }
  }, [isFetching]);

  return (
    <div
      className={`overflow-scroll ${isMobile ? "h-[70vh] max-h-[70vh]" : "h-[80vh] max-h-[80vh] w-full px-4"}`}
    >
      {showLoading ? (
        <div className="mx-auto mt-6 max-w-[870px] space-y-4">
          <Skeleton className="h-8 w-40 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
          <Skeleton className="h-8 w-30 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
        </div>
      ) : (
        <ReadOnlyTiptap draft={content} />
      )}
    </div>
  );
}
