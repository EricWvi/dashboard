import {
  useUpdateWatch,
  WatchStatus,
  type Watch,
  WatchType,
  WatchMeasure,
  useCompleteWatch,
} from "@/hooks/use-watches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { types } from "@/components/react-table/watch-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useState } from "react";
import {
  Plus,
  Package2,
  X,
  BookOpen,
  Swords,
  Play,
  Minus,
  TicketCheck,
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { dateString, formatMediaUrl } from "@/lib/utils";
import { toast } from "sonner";

const compressOptions = {
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: true,
  initialQuality: 0.8,
};

const WatchingItem = ({ watch }: { watch: Watch }) => {
  const isMobile = useIsMobile();
  const type = types.find((type) => type.value === watch.type);

  const updateWatchMutation = useUpdateWatch(WatchStatus.WATCHING);
  const completeWatchMutation = useCompleteWatch();
  const updateWatch = (watch: { id: number } & Partial<Watch>) => {
    updateWatchMutation.mutate(watch);
  };
  const completeWatch = (watch: { id: number; rate: number }) => {
    completeWatchMutation.mutate(watch);
  };

  // update progress
  const [updateProgressOpen, setUpdateProgressOpen] = useState(false);
  const [entryMeasure, setEntryMeasure] = useState<WatchMeasure | "">("");
  const [measureRange, setMeasureRange] = useState<number>(0);
  const [watchProgress, setWatchProgress] = useState<number>(0);
  const handleUpdateProgressOpen = (open: boolean) => {
    if (open) {
      setEntryMeasure(watch.payload.measure ?? "");
      setMeasureRange(watch.payload.range ?? 0);
      setWatchProgress(watch.payload.progress ?? 0);
    }
    setUpdateProgressOpen(open);
  };

  // complete watch
  const [completeWatchOpen, setCompleteWatchOpen] = useState(false);
  const [entryRate, setEntryRate] = useState<number>(16);
  const handleCompleteWatchOpen = (open: boolean) => {
    if (open) {
      setEntryRate(16);
    }
    setCompleteWatchOpen(open);
  };

  // edit
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | "">("");
  const [entryYear, setEntryYear] = useState<number>(0);
  const [entryImg, setEntryImg] = useState<string | undefined>(undefined);
  const [entryLink, setEntryLink] = useState("");
  const handleEditEntryDialogOpen = (open: boolean) => {
    if (open) {
      setEntryName(watch.title);
      setEntryType(watch.type);
      setEntryYear(watch.year);
      setProgress(0);
      setEntryImg(watch.payload.img ?? undefined);
      setEntryLink(watch.payload.link ?? "");
    }
    setEditEntryDialogOpen(open);
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const compressed = await imageCompression(files[0], compressOptions);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("photos", compressed, files[0].name);

    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setEntryImg(formatMediaUrl(JSON.parse(xhr.responseText).photos[0]));
        setProgress(0);
      } else {
        toast("Upload Failed");
      }
    };

    xhr.onerror = () => toast("Network error");

    xhr.send(formData);
  };

  return (
    <div>
      <Card className="gap-4 overflow-hidden border-0 pt-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
        <div className="relative">
          <img
            src={watch.payload.img || "/placeholder.svg"}
            alt={watch.title}
            className="h-48 w-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleEditEntryDialogOpen(true)}
            >
              <span className="flex items-center gap-1">
                {type && <type.icon className="size-4" />}
                {watch.type}
              </span>
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <CardHeader>
            <CardTitle className="text-xl font-medium">
              {watch.title}{" "}
              {watch.year !== 2099 && (
                <span className="text-muted-foreground text-base">
                  ({watch.year})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="cursor-pointer space-y-2"
              onClick={() => handleUpdateProgressOpen(true)}
            >
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm font-medium">
                  {`${watch.payload.measure} ${watch.payload.progress} of ${watch.payload.range}`}
                </span>
                <span className="text-sm font-medium">
                  {(
                    (watch.payload.progress * 100) /
                    watch.payload.range
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <Progress
                value={(watch.payload.progress * 100) / watch.payload.range}
              />
            </div>

            {watch.payload.progress != watch.payload.range ? (
              <a
                href={watch.payload.link ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!watch.payload.link) {
                    e.preventDefault();
                  }
                }}
              >
                <Button variant="secondary" className="w-full">
                  {[WatchType.BOOK, WatchType.MANGA].includes(watch.type) ? (
                    <BookOpen />
                  ) : watch.type === WatchType.GAME ? (
                    <Swords />
                  ) : (
                    <Play />
                  )}
                  Continue{" "}
                  {[WatchType.BOOK, WatchType.MANGA].includes(watch.type)
                    ? "Reading"
                    : watch.type === WatchType.GAME
                      ? "Playing"
                      : "Watching"}
                </Button>
              </a>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleCompleteWatchOpen(true)}
              >
                <TicketCheck />
                Done
              </Button>
            )}
          </CardContent>
        </div>
      </Card>

      {/* edit watch entry dialog */}
      <Dialog
        open={editEntryDialogOpen}
        onOpenChange={handleEditEntryDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Watching Entry</DialogTitle>
            <DialogDescription>
              Stay up to date with the entries that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-name">Name</Label>
                <Input
                  id="watching-edit-watch-name"
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-year">Year</Label>
                <Input
                  id="watching-edit-watch-year"
                  placeholder={!isMobile ? "Enter entry year..." : ""}
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-type">Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watching-edit-watch-type"
                      placeholder={!isMobile ? "Select entry type" : ""}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((type, idx) => (
                        <SelectItem key={idx} value={type.value}>
                          <type.icon />
                          {type.value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-link">Link</Label>
                <Input
                  id="watching-edit-watch-link"
                  placeholder={!isMobile ? "Enter entry link..." : ""}
                  type="text"
                  value={entryLink}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryLink(e.target.value)}
                />
              </div>
            </div>

            <div className="relative aspect-[16/9]">
              {entryImg ? (
                <>
                  <img
                    src={entryImg}
                    alt={entryName}
                    className="size-full rounded-md object-cover"
                  />
                  <Button
                    variant="secondary"
                    className="absolute top-1 right-1"
                    onClick={() => setEntryImg(undefined)}
                  >
                    <X />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="size-full border-2 border-dashed"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  {progress ? (
                    <Progress value={progress} />
                  ) : (
                    <Plus className="text-muted-foreground size-8" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                </Button>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="secondary">
                <Package2 />
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditEntryDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateWatch({
                      id: watch.id,
                      title: entryName,
                      type: entryType === "" ? watch.type : entryType,
                      year: entryYear === 0 ? watch.year : entryYear,
                      payload: {
                        ...watch.payload,
                        img: entryImg,
                        link: entryLink,
                      },
                    });
                    handleEditEntryDialogOpen(false);
                  }}
                  disabled={!entryName.trim() || updateWatchMutation.isPending}
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* update progress dialog */}
      <Dialog open={updateProgressOpen} onOpenChange={handleUpdateProgressOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Watching Progress</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-update-progress-measure">
                  Measure
                </Label>
                <Select
                  value={entryMeasure}
                  onValueChange={(v: string) => {
                    setEntryMeasure(v as WatchMeasure);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watching-update-progress-measure"
                      placeholder={!isMobile ? "Select measure type" : ""}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(WatchMeasure).map(
                        ([_key, value], idx) => (
                          <SelectItem key={idx} value={value}>
                            {value}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-update-progress-range">Range</Label>
                <Input
                  id="watching-update-progress-range"
                  placeholder={!isMobile ? "Enter measure range..." : ""}
                  value={measureRange}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setMeasureRange(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-4">
              <Label htmlFor="watching-edit-watch-progress">
                Progress: {watchProgress}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="size-6 !px-1"
                  onClick={() =>
                    setWatchProgress((prev) => Math.max(prev - 1, 0))
                  }
                >
                  <Minus className="size-3" />
                </Button>
                <Slider
                  id="watching-edit-watch-progress"
                  value={[watchProgress]}
                  max={watch.payload.range ?? 100}
                  step={1}
                  onValueChange={(value) => setWatchProgress(value[0])}
                />
                <Button
                  variant="outline"
                  className="size-6 !px-1"
                  onClick={() =>
                    setWatchProgress((prev) =>
                      Math.min(prev + 1, watch.payload.range ?? 100),
                    )
                  }
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleUpdateProgressOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // if today already have progress, update it
                  let curr: [string, number][] =
                    watch.payload.checkpoints ?? [];
                  if (curr.length > 0) {
                    const today = dateString(new Date(), "-");
                    const existing = curr.findIndex(([date]) => date === today);
                    if (existing !== -1) {
                      curr[existing][1] = watchProgress;
                    } else {
                      curr.push([today, watchProgress]);
                    }
                  }
                  updateWatch({
                    id: watch.id,
                    payload: {
                      ...watch.payload,
                      measure:
                        entryMeasure === ""
                          ? WatchMeasure.PERCENTAGE
                          : entryMeasure,
                      range:
                        measureRange >= watchProgress
                          ? measureRange
                          : watchProgress,
                      progress: watchProgress,
                      checkpoints: curr,
                    },
                  });
                  handleUpdateProgressOpen(false);
                }}
                disabled={updateWatchMutation.isPending}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* complete watch dialog */}
      <Dialog open={completeWatchOpen} onOpenChange={handleCompleteWatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Watch</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="mb-6 flex flex-col gap-4">
              <Label htmlFor="watching-complete-watch-rating">
                Rating: {(entryRate / 2).toFixed(1)}
              </Label>
              <Slider
                id="watching-complete-watch-rating"
                value={[entryRate]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0])}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleCompleteWatchOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  completeWatch({
                    id: watch.id,
                    rate: entryRate,
                  });
                  handleCompleteWatchOpen(false);
                }}
                disabled={completeWatchMutation.isPending}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const WatchingList = ({ watches }: { watches: Watch[] }) => {
  const isMobile = useIsMobile();
  return (
    <div
      className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isMobile ? "mx-6" : ""}`}
    >
      {watches.map((watch) => (
        <WatchingItem key={watch.id} watch={watch} />
      ))}
    </div>
  );
};
