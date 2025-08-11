"use client";

import { type Row } from "@tanstack/react-table";
import { CalendarIcon, MoreHorizontal, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { types } from "@/components/react-table/watch-columns";
import {
  useDeleteWatch,
  useStartWatch,
  useUpdateWatch,
  WatchMeasure,
  WatchStatus,
  WatchType,
  type Watch,
} from "@/hooks/use-watches";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateString, formatMediaUrl, todayStart } from "@/lib/utils";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

const compressOptions = {
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExif: true,
  initialQuality: 0.8,
};

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function WatchedTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const isMobile = useIsMobile();
  const watch = row.original as Watch;
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | undefined>(undefined);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryRate, setEntryRate] = useState<number>(16);
  const [entryMarkInput, setEntryMarkInput] = useState("");
  const [entryMark, setEntryMark] = useState<Date | undefined>(undefined);
  const [datepickerOpen, setDatepickerOpen] = useState(false);
  const updateWatchMutation = useUpdateWatch(WatchStatus.COMPLETED);
  const updateWatch = (watch: Watch) => {
    updateWatchMutation.mutate(watch);
  };

  const deleteWatchMutation = useDeleteWatch();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteWatch = () => {
    deleteWatchMutation.mutate({ id: watch.id, status: watch.status });
  };

  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const handleEditEntryDialogOpen = (open: boolean) => {
    if (open) {
      setEntryName(watch.title);
      setEntryType(watch.type);
      setEntryYear(watch.year);
      setEntryRate(watch.rate);
      setEntryMarkInput(dateString(watch.createdAt));
      setEntryMark(watch.createdAt);
    }
    setEditEntryDialogOpen(open);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted size-8"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => handleEditEntryDialogOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem>Watch Again</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDialogOpen(true)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete [{watch.title}]?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWatch();
                setConfirmDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit watch entry dialog */}
      <Dialog
        open={editEntryDialogOpen}
        onOpenChange={handleEditEntryDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Watched Entry</DialogTitle>
            <DialogDescription>
              Stay up to date with the entries that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-name">Name</Label>
                <Input
                  id="watched-edit-watch-name"
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-year">Year</Label>
                <Input
                  id="watched-edit-watch-year"
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
                <Label htmlFor="watched-edit-watch-type">Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watched-edit-watch-type"
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
                <Label htmlFor="watched-edit-watch-mark">Mark</Label>
                <div className="relative">
                  <Input
                    id="watched-edit-watch-mark"
                    placeholder={!isMobile ? "Enter completed date..." : ""}
                    value={entryMarkInput}
                    disabled={updateWatchMutation.isPending}
                    onChange={(e) => {
                      setEntryMarkInput(e.target.value);
                      setEntryMark(new Date(e.target.value));
                    }}
                  />
                  <Popover
                    open={datepickerOpen}
                    onOpenChange={setDatepickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                      >
                        <CalendarIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="end"
                      alignOffset={-8}
                      sideOffset={10}
                    >
                      <Calendar
                        mode="single"
                        selected={entryMark}
                        captionLayout="dropdown"
                        // month={month}
                        // onMonthChange={setMonth}
                        onSelect={(date) => {
                          if (date) {
                            setEntryMark(date);
                          }
                          setEntryMarkInput(dateString(date));
                          setDatepickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div className="mb-6 flex flex-col gap-2">
              <Label htmlFor="watched-edit-watch-rating">
                Rating: {(entryRate / 2).toFixed(1)}
              </Label>
              <Slider
                id="watched-edit-watch-rating"
                value={[entryRate]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0])}
              />
            </div>

            <div className="flex justify-end gap-2">
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
                    type: entryType ?? WatchType.MOVIE,
                    status: WatchStatus.COMPLETED,
                    year: entryYear ?? new Date().getFullYear(),
                    rate: entryRate,
                    createdAt: entryMark ?? todayStart(),
                    payload: watch.payload,
                  });
                  handleEditEntryDialogOpen(false);
                }}
                disabled={!entryName.trim() || updateWatchMutation.isPending}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}

export function ToWatchTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const isMobile = useIsMobile();
  const watch = row.original as Watch;
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | undefined>(undefined);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryImg, setEntryImg] = useState<string | undefined>(undefined);
  const [entryLink, setEntryLink] = useState<string>("");
  const updateWatchMutation = useUpdateWatch(WatchStatus.PLAN_TO_WATCH);
  const startWatchMutation = useStartWatch();
  const updateWatch = (watch: { id: number } & Partial<Watch>) => {
    updateWatchMutation.mutate(watch);
  };

  // start watching dialog
  const [startWatchingDialogOpen, setStartWatchingDialogOpen] = useState(false);
  const [entryMeasure, setEntryMeasure] = useState<WatchMeasure | "">("");
  const [measureRange, setMeasureRange] = useState<string>("");
  const handleStartWatchingDialogOpen = (open: boolean) => {
    if (open) {
      setEntryMeasure("");
      setMeasureRange("");
    }
    setStartWatchingDialogOpen(open);
  };
  const startWatch = (watch: { id: number; payload: any }) => {
    startWatchMutation.mutate(watch);
  };

  // confirm Dialog
  const deleteWatchMutation = useDeleteWatch();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteWatch = () => {
    deleteWatchMutation.mutate({ id: watch.id, status: watch.status });
  };

  // edit watch entry dialog
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [progress, setProgress] = useState(0);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted size-8"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => handleEditEntryDialogOpen(true)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStartWatchingDialogOpen(true)}>
          Start to Watch
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDialogOpen(true)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* start watching dialog */}
      <Dialog
        open={startWatchingDialogOpen}
        onOpenChange={handleStartWatchingDialogOpen}
      >
        <DialogContent className="gap-1 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start {watch.title}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-start-watch-measure">Measure</Label>
                <Select
                  value={entryMeasure}
                  onValueChange={(v: string) => {
                    setEntryMeasure(v as WatchMeasure);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-start-watch-measure"
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
                <Label htmlFor="towatch-start-watch-range">Range</Label>
                <Input
                  id="towatch-start-watch-range"
                  placeholder={!isMobile ? "Enter measure range..." : ""}
                  value={measureRange}
                  disabled={startWatchMutation.isPending}
                  onChange={(e) => setMeasureRange(e.target.value)}
                />
              </div>
            </div>

            {entryImg && (
              <div className="aspect-[16/9]">
                <img
                  src={entryImg}
                  alt={entryName}
                  className="size-full rounded-md object-cover"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleStartWatchingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  startWatch({
                    id: watch.id,
                    payload: {
                      ...watch.payload,
                      measure:
                        entryMeasure === ""
                          ? WatchMeasure.PERCENTAGE
                          : entryMeasure,
                      range: isNaN(Number(measureRange))
                        ? 0
                        : Number(measureRange),
                      progress: 0,
                      checkpoints: [[dateString(new Date(), "-"), 0]],
                    },
                  });
                  handleStartWatchingDialogOpen(false);
                }}
                disabled={startWatchMutation.isPending}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete [{watch.title}]?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWatch();
                setConfirmDialogOpen(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit watch entry dialog */}
      <Dialog
        open={editEntryDialogOpen}
        onOpenChange={handleEditEntryDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit ToWatch Entry</DialogTitle>
            <DialogDescription>
              Stay up to date with the entries that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-name">Name</Label>
                <Input
                  id="towatch-edit-watch-name"
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-year">Year</Label>
                <Input
                  id="towatch-edit-watch-year"
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
                <Label htmlFor="towatch-edit-watch-type">Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-edit-watch-type"
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
                <Label htmlFor="towatch-edit-watch-link">Link</Label>
                <Input
                  id="towatch-edit-watch-link"
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

            <div className="flex justify-end gap-2">
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
                    type: entryType ?? WatchType.MOVIE,
                    year: entryYear ?? new Date().getFullYear(),
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
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
