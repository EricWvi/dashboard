"use client";

import { type Row } from "@tanstack/react-table";
import { CalendarIcon, MoreHorizontal, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/multi-select";
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
import WatchCheckpoints from "@/components/watch-checkpoint";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { domains, types } from "@/components/react-table/data-table-columns";
import {
  useDeleteWatch,
  useStartWatch,
  useUpdateWatch,
  WatchMeasureEnum,
  WatchStatus,
  WatchEnum,
  type WatchType,
  type Watch,
  useCreateToWatch,
  type WatchMeasure,
  WatchTypeText,
  WatchMeasureText,
} from "@/hooks/use-watches";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateString, formatMediaUrl, todayStart } from "@/lib/utils";
import { fileUpload } from "@/lib/file-upload";
import {
  Domain,
  useDeleteBookmark,
  useTags,
  useUpdateBookmark,
  type Bookmark,
  type DomainType,
} from "@/hooks/use-bookmarks";
import { createTiptap } from "@/hooks/use-draft";
import { useTTContext } from "@/components/editor";
import { BlogEnum, useUpdateBlog, type Blog } from "@/hooks/use-blogs";
import { useUserContext } from "@/user-provider";
import { UserLangEnum } from "@/hooks/use-user";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function WatchedTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const watch = row.original as Watch;
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | undefined>(undefined);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryRate, setEntryRate] = useState<number>(16);
  const [entryImg, setEntryImg] = useState<string | undefined>(undefined);
  const [entryMarkInput, setEntryMarkInput] = useState("");
  const [entryMark, setEntryMark] = useState<Date | undefined>(undefined);
  const [entryMarkMonth, setEntryMarkMonth] = useState<Date>(new Date());
  const [entryAuthor, setEntryAuthor] = useState<string>("");
  const [datepickerOpen, setDatepickerOpen] = useState(false);
  const updateWatchMutation = useUpdateWatch([WatchStatus.COMPLETED]);
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();

  const updateWatch = () => {
    return updateWatchMutation.mutateAsync({
      id: watch.id,
      title: entryName,
      type: entryType ?? WatchEnum.MOVIE,
      status: WatchStatus.COMPLETED,
      year: entryYear ?? new Date().getFullYear(),
      rate: entryRate,
      createdAt: entryMark ?? todayStart(),
      payload: { ...watch.payload, img: entryImg },
      author: entryAuthor,
    });
  };
  const editQuotes = async () => {
    if (!watch.payload.quotes) {
      const draftId = await createTiptap();
      updateWatchMutation.mutateAsync({
        id: watch.id,
        payload: { ...watch.payload, quotes: draftId },
      });
      setEditorId(draftId);
      setEditorDialogOpen(true);
    } else {
      setEditorId(watch.payload.quotes);
      setEditorDialogOpen(true);
    }
  };
  const reviewWatch = async () => {
    if (!watch.payload.review) {
      const draftId = await createTiptap();
      updateWatchMutation.mutateAsync({
        id: watch.id,
        payload: { ...watch.payload, review: draftId },
      });
      setEditorId(draftId);
      setEditorDialogOpen(true);
    } else {
      setEditorId(watch.payload.review);
      setEditorDialogOpen(true);
    }
  };

  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);

  // delete confirm
  const deleteWatchMutation = useDeleteWatch();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteWatch = () => {
    return deleteWatchMutation.mutateAsync({
      id: watch.id,
      status: watch.status,
    });
  };

  // watch again confirm
  const [watchAgainDialogOpen, setWatchAgainDialogOpen] = useState(false);
  const createEntryMutation = useCreateToWatch();
  const watchAgain = () => {
    return createEntryMutation.mutateAsync({
      title: watch.title,
      type: watch.type,
      status: WatchStatus.PLAN_TO_WATCH,
      year: watch.year,
      rate: 0,
      payload: {
        ...watch.payload,
        progress: 0,
        epoch: (watch.payload.epoch ?? 1) + 1,
        checkpoints: [],
      },
      author: watch.author,
    });
  };

  // edit watch entry dialog
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const handleEditEntryDialogOpen = (open: boolean) => {
    if (open) {
      setEntryName(watch.title);
      setEntryType(watch.type);
      setEntryYear(watch.year);
      setEntryImg(watch.payload.img ?? undefined);
      setEntryRate(watch.rate);
      setEntryMarkInput(dateString(watch.createdAt));
      setEntryMark(new Date(watch.createdAt));
      setEntryMarkMonth(new Date(watch.createdAt));
      setEntryAuthor(watch.author);
    }
    setEditEntryDialogOpen(open);
  };
  const [progress, setProgress] = useState(0);
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    fileUpload({
      event,
      onProgress: (progress) => {
        setProgress(progress);
      },
      onSuccess: (response) => {
        setEntryImg(formatMediaUrl(JSON.parse(response).photos[0]));
        setProgress(0);
      },
    });
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
          {watchI18nText[language].edit}
        </DropdownMenuItem>
        {watch.type === WatchEnum.BOOK && (
          <DropdownMenuItem onClick={editQuotes}>
            {watchI18nText[language].quotes}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={reviewWatch}>
          {watchI18nText[language].review}
        </DropdownMenuItem>
        {watch.payload.checkpoints && (
          <DropdownMenuItem onClick={() => setTimelineDialogOpen(true)}>
            {watchI18nText[language].timeline}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setWatchAgainDialogOpen(true)}>
          {watchI18nText[language].watchAgain}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDialogOpen(true)}
        >
          {watchI18nText[language].delete}
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* confirm delete dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{watchI18nText[language].confirmDeletion}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {watchI18nText[language].confirmDeletionStart}
              {watch.title}
              {watchI18nText[language].confirmDeletionEnd}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {watchI18nText[language].cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWatch().then(() => setConfirmDialogOpen(false));
              }}
            >
              {watchI18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm watch again dialog */}
      <Dialog
        open={watchAgainDialogOpen}
        onOpenChange={setWatchAgainDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{watchI18nText[language].watchAgain}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {watchI18nText[language].watchAgainStart}
              {watch.title}
              {watchI18nText[language].watchAgainEnd}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setWatchAgainDialogOpen(false)}
            >
              {watchI18nText[language].cancel}
            </Button>
            <Button
              onClick={() => {
                watchAgain().then(() => {
                  setWatchAgainDialogOpen(false);
                });
              }}
            >
              {watchI18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* timeline display dialog */}
      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>{watchI18nText[language].timeline}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <WatchCheckpoints
            type={watch.type}
            measure={
              (watch.payload.measure ??
                WatchMeasureEnum.PERCENTAGE) as WatchMeasure
            }
            checkpoints={watch.payload.checkpoints ?? []}
          />
        </DialogContent>
      </Dialog>

      {/* edit watch entry dialog */}
      <Dialog
        open={editEntryDialogOpen}
        onOpenChange={handleEditEntryDialogOpen}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {watchI18nText[language].editWatchedEntry}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-name">
                  {watchI18nText[language].name}
                </Label>
                <Input
                  id="watched-edit-watch-name"
                  placeholder={
                    !isMobile ? watchI18nText[language].namePlaceholder : ""
                  }
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-author">
                  {watchI18nText[language].author}
                </Label>
                <Input
                  id="watched-edit-watch-author"
                  placeholder={
                    !isMobile ? watchI18nText[language].authorPlaceholder : ""
                  }
                  value={entryAuthor}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryAuthor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-type">
                  {watchI18nText[language].type}
                </Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watched-edit-watch-type"
                      placeholder={
                        !isMobile ? watchI18nText[language].typePlaceholder : ""
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((type, idx) => (
                        <SelectItem key={idx} value={type.value}>
                          <type.icon />
                          {WatchTypeText[type.value][language]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-year">
                  {watchI18nText[language].year}
                </Label>
                <Input
                  id="watched-edit-watch-year"
                  placeholder={
                    !isMobile ? watchI18nText[language].yearPlaceholder : ""
                  }
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mb-6 flex flex-col gap-2">
              <Label htmlFor="watched-edit-watch-rating">
                {watchI18nText[language].rating} {(entryRate / 2).toFixed(1)}
              </Label>
              <Slider
                id="watched-edit-watch-rating"
                value={[entryRate]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-edit-watch-mark">
                  {watchI18nText[language].mark}
                </Label>
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
                        month={entryMarkMonth}
                        onMonthChange={setEntryMarkMonth}
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
                    id="watched-edit-watch-img"
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
                {watchI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateWatch().then(() => handleEditEntryDialogOpen(false));
                }}
                disabled={!entryName.trim() || updateWatchMutation.isPending}
              >
                {watchI18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}

const watchI18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
    review: "评论",
    quotes: "书摘",
    timeline: "时间线",
    watchAgain: "再看一次",
    watchAgainStart: "你想要再看一遍「",
    watchAgainEnd: "」吗？",
    moveToTop: "置顶",
    startWatching: "标记在看",
    delete: "删除",
    editToWatchEntry: "编辑想看",
    editWatchedEntry: "编辑已看",
    name: "名称",
    namePlaceholder: "输入名称...",
    author: "作者",
    authorPlaceholder: "输入作者...",
    type: "类别",
    typePlaceholder: "选择类别",
    year: "年份",
    yearPlaceholder: "输入年份...",
    rating: "评分：",
    mark: "完成日期",
    link: "链接",
    linkPlaceholder: "输入链接...",
    cancel: "取消",
    update: "更新",
    start: "开始",
    measure: "进度单位",
    measurePlaceholder: "选择进度单位",
    range: "总量",
    measureRangePlaceholder: "输入进度总量...",
    confirmDeletion: "确认删除",
    confirmDeletionStart: "确定要删除「",
    confirmDeletionEnd: "」吗？",
    confirm: "确认",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
    review: "Review",
    quotes: "Quotes",
    timeline: "Timeline",
    watchAgain: "Watch Again",
    watchAgainStart: "Do you want to watch [",
    watchAgainEnd: "] again?",
    moveToTop: "Move to Top",
    startWatching: "Start Watching",
    delete: "Delete",
    editToWatchEntry: "Edit ToWatch Entry",
    editWatchedEntry: "Edit Watched Entry",
    name: "Name",
    namePlaceholder: "Enter entry name...",
    author: "Author",
    authorPlaceholder: "Enter entry author...",
    type: "Type",
    typePlaceholder: "Select entry type",
    year: "Year",
    yearPlaceholder: "Enter entry year...",
    rating: "Rating:",
    mark: "Mark",
    link: "Link",
    linkPlaceholder: "Enter entry link...",
    cancel: "Cancel",
    update: "Update",
    start: "Start",
    measure: "Measure",
    measurePlaceholder: "Select measure type",
    range: "Range",
    measureRangePlaceholder: "Enter measure range...",
    confirmDeletion: "Confirm Deletion",
    confirmDeletionStart: "Are you sure you want to delete [",
    confirmDeletionEnd: "]?",
    confirm: "Confirm",
  },
};

export function ToWatchTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const watch = row.original as Watch;
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | undefined>(undefined);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryImg, setEntryImg] = useState<string | undefined>(undefined);
  const [entryLink, setEntryLink] = useState<string>("");
  const [entryAuthor, setEntryAuthor] = useState<string>("");
  const updateWatchMutation = useUpdateWatch([WatchStatus.PLAN_TO_WATCH]);
  const startWatchMutation = useStartWatch();

  const updateWatch = () => {
    return updateWatchMutation.mutateAsync({
      id: watch.id,
      title: entryName,
      type: entryType ?? WatchEnum.MOVIE,
      year: entryYear ?? new Date().getFullYear(),
      payload: {
        ...watch.payload,
        img: entryImg,
        link: entryLink,
      },
      author: entryAuthor,
    });
  };
  const reviewWatch = async () => {
    if (!watch.payload.review) {
      const draftId = await createTiptap();
      updateWatchMutation.mutateAsync({
        id: watch.id,
        payload: { ...watch.payload, review: draftId },
      });
      setEditorId(draftId);
      setEditorDialogOpen(true);
    } else {
      setEditorId(watch.payload.review);
      setEditorDialogOpen(true);
    }
  };
  const moveToTop = () => {
    return updateWatchMutation.mutateAsync({
      id: watch.id,
      createdAt: new Date(),
    });
  };

  // start watching dialog
  const [startWatchingDialogOpen, setStartWatchingDialogOpen] = useState(false);
  const [entryMeasure, setEntryMeasure] = useState<WatchMeasure | "">("");
  const [measureRange, setMeasureRange] = useState<string>("");
  const handleStartWatchingDialogOpen = (open: boolean) => {
    if (open) {
      setEntryName(watch.title);
      setEntryImg(watch.payload.img ?? undefined);
      setEntryMeasure((watch.payload.measure as WatchMeasure) ?? "");
      setMeasureRange(String(watch.payload.range ?? ""));
    }
    setStartWatchingDialogOpen(open);
  };
  const startWatch = () => {
    return startWatchMutation.mutateAsync({
      id: watch.id,
      payload: {
        ...watch.payload,
        measure:
          entryMeasure === "" ? WatchMeasureEnum.PERCENTAGE : entryMeasure,
        range: isNaN(Number(measureRange)) ? 0 : Number(measureRange),
        progress: 0,
        checkpoints: [[dateString(new Date(), "-"), 0]],
      },
      title: watch.title,
      type: watch.type,
      link: watch.payload.link ?? "",
    });
  };

  // confirm Dialog
  const deleteWatchMutation = useDeleteWatch();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteWatch = () => {
    return deleteWatchMutation.mutateAsync({
      id: watch.id,
      status: watch.status,
    });
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
      setEntryAuthor(watch.author);
    }
    setEditEntryDialogOpen(open);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    fileUpload({
      event,
      onProgress: (progress) => {
        setProgress(progress);
      },
      onSuccess: (response) => {
        setEntryImg(formatMediaUrl(JSON.parse(response).photos[0]));
        setProgress(0);
      },
    });
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
          {watchI18nText[language].edit}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={reviewWatch}>
          {watchI18nText[language].review}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => moveToTop()}>
          {watchI18nText[language].moveToTop}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStartWatchingDialogOpen(true)}>
          {watchI18nText[language].startWatching}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDialogOpen(true)}
        >
          {watchI18nText[language].delete}
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* start watching dialog */}
      <Dialog
        open={startWatchingDialogOpen}
        onOpenChange={handleStartWatchingDialogOpen}
      >
        <DialogContent className="gap-1 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {watchI18nText[language].start} {watch.title}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-start-watch-measure">
                  {watchI18nText[language].measure}
                </Label>
                <Select
                  value={entryMeasure}
                  onValueChange={(v: string) => {
                    setEntryMeasure(v as WatchMeasure);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-start-watch-measure"
                      placeholder={
                        !isMobile
                          ? watchI18nText[language].measurePlaceholder
                          : ""
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(WatchMeasureEnum).map(
                        ([_key, value], idx) => (
                          <SelectItem key={idx} value={value}>
                            {WatchMeasureText[value][language]}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-start-watch-range">
                  {watchI18nText[language].range}
                </Label>
                <Input
                  id="towatch-start-watch-range"
                  placeholder={
                    !isMobile
                      ? watchI18nText[language].measureRangePlaceholder
                      : ""
                  }
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
                {watchI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  startWatch().then(() => handleStartWatchingDialogOpen(false));
                }}
                disabled={startWatchMutation.isPending}
              >
                {watchI18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{watchI18nText[language].confirmDeletion}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {watchI18nText[language].confirmDeletionStart}
              {watch.title}
              {watchI18nText[language].confirmDeletionEnd}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {watchI18nText[language].cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWatch().then(() => setConfirmDialogOpen(false));
              }}
            >
              {watchI18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit watch entry dialog */}
      <Dialog
        open={editEntryDialogOpen}
        onOpenChange={handleEditEntryDialogOpen}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {watchI18nText[language].editToWatchEntry}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-name">
                  {watchI18nText[language].name}
                </Label>
                <Input
                  id="towatch-edit-watch-name"
                  placeholder={
                    !isMobile ? watchI18nText[language].namePlaceholder : ""
                  }
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-author">
                  {watchI18nText[language].author}
                </Label>
                <Input
                  id="towatch-edit-watch-author"
                  placeholder={
                    !isMobile ? watchI18nText[language].authorPlaceholder : ""
                  }
                  value={entryAuthor}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryAuthor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-type">
                  {watchI18nText[language].type}
                </Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-edit-watch-type"
                      placeholder={
                        !isMobile ? watchI18nText[language].typePlaceholder : ""
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((type, idx) => (
                        <SelectItem key={idx} value={type.value}>
                          <type.icon />
                          {WatchTypeText[type.value][language]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-edit-watch-year">
                  {watchI18nText[language].year}
                </Label>
                <Input
                  id="towatch-edit-watch-year"
                  placeholder={
                    !isMobile ? watchI18nText[language].yearPlaceholder : ""
                  }
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="towatch-edit-watch-link">
                {watchI18nText[language].link}
              </Label>
              <Input
                id="towatch-edit-watch-link"
                placeholder={
                  !isMobile ? watchI18nText[language].linkPlaceholder : ""
                }
                type="text"
                value={entryLink}
                disabled={updateWatchMutation.isPending}
                onChange={(e) => setEntryLink(e.target.value)}
              />
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
                    id="towatch-edit-watch-img"
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
                  updateWatch().then(() => handleEditEntryDialogOpen(false));
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

const bookmarkI18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
    delete: "删除",
    confirm: "确认",
    cancel: "取消",
    confirmDeletion: "确认删除",
    confirmDeletionStart: "确定要删除「",
    confirmDeletionEnd: "」吗？",
    domain: "领域",
    what: "一级标签",
    how: "二级标签",
    searchPlaceholder: "搜索",
    editBookmark: "编辑书签",
    title: "标题",
    titlePlaceholder: "输入书签标题...",
    domainPlaceholder: "选择领域",
    link: "链接",
    linkPlaceholder: "输入书签链接...",
    update: "更新",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
    confirmDeletion: "Confirm Deletion",
    confirmDeletionStart: "Are you sure you want to delete [",
    confirmDeletionEnd: "]?",
    domain: "Domain",
    what: "What",
    how: "How",
    searchPlaceholder: "Filter bookmarks...",
    editBookmark: "Edit Bookmark",
    title: "Title",
    titlePlaceholder: "Enter bookmark title...",
    domainPlaceholder: "Select domain",
    link: "Link",
    linkPlaceholder: "Enter bookmark link...",
    update: "Update",
  },
};

export function BookmarkTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const { data: tags } = useTags();
  const bookmark = row.original as Bookmark;
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkType, setBookmarkType] = useState<DomainType>(Domain.KNL);
  const [bookmarkLink, setBookmarkLink] = useState<string>("");
  const [selectedWhats, setSelectedWhats] = useState<string[]>([]);
  const [selectedHows, setSelectedHows] = useState<string[]>([]);
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const updateBookmarkMutation = useUpdateBookmark();
  const updateBookmark = async () => {
    const draft =
      bookmarkLink === "cheatsheet" && !bookmark.payload.draft
        ? await createTiptap()
        : bookmark.payload.draft;
    return updateBookmarkMutation.mutateAsync({
      id: bookmark.id,
      title: bookmarkName,
      url: bookmarkLink,
      domain: bookmarkType,
      payload: {
        ...bookmark.payload,
        draft,
        whats: selectedWhats,
        hows: selectedHows,
      },
    });
  };

  // confirm Dialog
  const deleteBookmarkMutation = useDeleteBookmark();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const deleteBookmark = () => {
    return deleteBookmarkMutation.mutateAsync({ id: bookmark.id });
  };

  // edit bookmark dialog
  const [editBookmarkDialogOpen, setEditBookmarkDialogOpen] = useState(false);
  const handleEditBookmarkDialogOpen = (open: boolean) => {
    if (open) {
      setBookmarkName(bookmark.title);
      setBookmarkType(bookmark.domain);
      setBookmarkLink(bookmark.url);
      setSelectedWhats(bookmark.payload.whats ?? []);
      setSelectedHows(bookmark.payload.hows ?? []);
    }
    setEditBookmarkDialogOpen(open);
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
        {!!bookmark.payload.draft && (
          <DropdownMenuItem
            onClick={() => {
              setEditorId(bookmark.payload.draft ?? 0);
              setEditorDialogOpen(true);
            }}
          >
            Cheat Sheet
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleEditBookmarkDialogOpen(true)}>
          {bookmarkI18nText[language].edit}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setConfirmDialogOpen(true)}
        >
          {bookmarkI18nText[language].delete}
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bookmarkI18nText[language].confirmDeletion}
            </DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {bookmarkI18nText[language].confirmDeletionStart}
              {bookmark.title}
              {bookmarkI18nText[language].confirmDeletionEnd}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {bookmarkI18nText[language].cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBookmarkMutation.isPending}
              onClick={() => {
                deleteBookmark().then(() => setConfirmDialogOpen(false));
              }}
            >
              {bookmarkI18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit bookmark dialog */}
      <Dialog
        open={editBookmarkDialogOpen}
        onOpenChange={handleEditBookmarkDialogOpen}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>{bookmarkI18nText[language].editBookmark}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-edit-title">
                  {bookmarkI18nText[language].title}
                </Label>
                <Input
                  id="bookmark-edit-title"
                  placeholder={
                    !isMobile ? bookmarkI18nText[language].titlePlaceholder : ""
                  }
                  value={bookmarkName}
                  disabled={updateBookmarkMutation.isPending}
                  onChange={(e) => setBookmarkName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-edit-domain">
                  {bookmarkI18nText[language].domain}
                </Label>
                <Select
                  value={bookmarkType}
                  onValueChange={(v: string) =>
                    setBookmarkType(v as DomainType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="bookmark-edit-domain"
                      placeholder={
                        !isMobile
                          ? bookmarkI18nText[language].domainPlaceholder
                          : ""
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {domains.map((type, idx) => (
                        <SelectItem key={idx} value={type.value}>
                          <type.icon />
                          {type.value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-edit-link">
                  {bookmarkI18nText[language].link}
                </Label>
                <Input
                  id="bookmark-edit-link"
                  placeholder={
                    !isMobile ? bookmarkI18nText[language].linkPlaceholder : ""
                  }
                  type="text"
                  value={bookmarkLink}
                  disabled={
                    updateBookmarkMutation.isPending ||
                    bookmarkLink === "cheatsheet"
                  }
                  onChange={(e) => setBookmarkLink(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-edit-what">
                  {bookmarkI18nText[language].what}
                </Label>
                <MultiSelect
                  id="bookmark-edit-what"
                  options={tags?.whatTags ?? []}
                  onValueChange={setSelectedWhats}
                  defaultValue={selectedWhats}
                  allowCreateNew
                  modalPopover
                  hideSelectAll
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-edit-how">
                  {bookmarkI18nText[language].how}
                </Label>
                <MultiSelect
                  id="bookmark-edit-how"
                  options={tags?.howTags ?? []}
                  onValueChange={setSelectedHows}
                  defaultValue={selectedHows}
                  allowCreateNew
                  modalPopover
                  hideSelectAll
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleEditBookmarkDialogOpen(false)}
              >
                {bookmarkI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateBookmark().then(() =>
                    handleEditBookmarkDialogOpen(false),
                  );
                }}
                disabled={
                  !bookmarkName.trim() || updateBookmarkMutation.isPending
                }
              >
                {bookmarkI18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}

const blogI18nText = {
  [UserLangEnum.ZHCN]: {
    what: "一级标签",
    how: "二级标签",
    rename: "重命名",
    archive: "归档",
    unarchive: "取消归档",
    publish: "公开发布",
    unpublish: "私有可见",
    confirmAction: "确认操作",
    confirmActionDescStart: "确定要",
    confirmActionDescEnd: "」吗？",
    archiveAction: "归档「",
    unarchiveAction: "取消归档「",
    publishAction: "发布「",
    unpublishAction: "取消发布「",
    confirm: "确认",
    cancel: "取消",
    update: "更新",
    editBlog: "编辑博客",
    title: "标题",
    titlePlaceholder: "输入博客标题...",
  },
  [UserLangEnum.ENUS]: {
    what: "What",
    how: "How",
    rename: "Rename",
    archive: "Archive",
    unarchive: "Unarchive",
    publish: "Publish",
    unpublish: "Unpublish",
    confirmAction: "Confirm Action",
    confirmActionDescStart: "Are you sure you want to ",
    confirmActionDescEnd: "]?",
    archiveAction: "{archive} [",
    unarchiveAction: "{unarchive} [",
    publishAction: "{publish} [",
    unpublishAction: "{unpublish} [",
    confirm: "Confirm",
    cancel: "Cancel",
    update: "Update",
    editBlog: "Edit Blog",
    title: "Title",
    titlePlaceholder: "Enter blog title...",
  },
};
export function BlogTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const { data: tags } = useTags();
  const blog = row.original as Blog;
  const [blogName, setBlogName] = useState("");
  const [selectedWhats, setSelectedWhats] = useState<string[]>([]);
  const [selectedHows, setSelectedHows] = useState<string[]>([]);
  const updateBlogMutation = useUpdateBlog();
  const updateBlog = () => {
    return updateBlogMutation.mutateAsync({
      id: blog.id,
      title: blogName,
      payload: {
        ...blog.payload,
        whats: selectedWhats,
        hows: selectedHows,
      },
    });
  };

  const publishBlog = () => {
    return updateBlogMutation.mutateAsync({
      id: blog.id,
      visibility: BlogEnum.PUBLIC,
    });
  };

  const unpublishBlog = () => {
    return updateBlogMutation.mutateAsync({
      id: blog.id,
      visibility: BlogEnum.PRIVATE,
    });
  };

  // confirm Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string>("");
  const [action, setAction] = useState<() => Promise<any>>(
    () => () => Promise.resolve(),
  ); // lazy initializer: func will execute immediately
  const archiveBlog = () => {
    return updateBlogMutation.mutateAsync({
      id: blog.id,
      visibility: BlogEnum.ARCHIVED,
    });
  };
  const unarchiveBlog = () => {
    return updateBlogMutation.mutateAsync({
      id: blog.id,
      visibility: BlogEnum.PRIVATE,
    });
  };

  // edit blog dialog
  const [editBlogDialogOpen, setEditBlogDialogOpen] = useState(false);
  const handleEditBlogDialogOpen = (open: boolean) => {
    if (open) {
      setBlogName(blog.title);
      setSelectedWhats(blog.payload.whats ?? []);
      setSelectedHows(blog.payload.hows ?? []);
    }
    setEditBlogDialogOpen(open);
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
        <DropdownMenuItem onClick={() => handleEditBlogDialogOpen(true)}>
          {blogI18nText[language].rename}
        </DropdownMenuItem>
        {blog.visibility === BlogEnum.PRIVATE && (
          <DropdownMenuItem
            onClick={() => {
              setConfirmAction("Publish");
              setAction(() => () => publishBlog());
              setConfirmDialogOpen(true);
            }}
          >
            {blogI18nText[language].publish}
          </DropdownMenuItem>
        )}
        {blog.visibility === BlogEnum.PUBLIC && (
          <DropdownMenuItem
            onClick={() => {
              setConfirmAction("Unpublish");
              setAction(() => () => unpublishBlog());
              setConfirmDialogOpen(true);
            }}
          >
            {blogI18nText[language].unpublish}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (blog.visibility === BlogEnum.ARCHIVED) {
              setConfirmAction("Unarchive");
              setAction(() => () => unarchiveBlog());
            } else {
              setConfirmAction("Archive");
              setAction(() => () => archiveBlog());
            }
            setConfirmDialogOpen(true);
          }}
        >
          <div className="text-yellow-700 hover:text-yellow-700 dark:text-yellow-600 dark:hover:text-yellow-600">
            {blog.visibility === BlogEnum.ARCHIVED
              ? blogI18nText[language].unarchive
              : blogI18nText[language].archive}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{blogI18nText[language].confirmAction}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {`${blogI18nText[language].confirmActionDescStart}${
                confirmAction === "Publish"
                  ? blogI18nText[language].publishAction
                  : confirmAction === "Archive"
                    ? blogI18nText[language].archiveAction
                    : confirmAction === "Unarchive"
                      ? blogI18nText[language].unarchiveAction
                      : blogI18nText[language].unpublishAction
              }${blog.title}${blogI18nText[language].confirmActionDescEnd}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {blogI18nText[language].cancel}
            </Button>
            <Button
              disabled={updateBlogMutation.isPending}
              onClick={() => {
                action().then(() => setConfirmDialogOpen(false));
              }}
            >
              {blogI18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit blog dialog */}
      <Dialog open={editBlogDialogOpen} onOpenChange={handleEditBlogDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>{blogI18nText[language].editBlog}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-edit-title">
                {blogI18nText[language].title}
              </Label>
              <Input
                id="blog-edit-title"
                placeholder={
                  !isMobile ? blogI18nText[language].titlePlaceholder : ""
                }
                value={blogName}
                disabled={updateBlogMutation.isPending}
                onChange={(e) => setBlogName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-edit-what">
                {blogI18nText[language].what}
              </Label>
              <MultiSelect
                id="blog-edit-what"
                options={tags?.whatTags ?? []}
                onValueChange={setSelectedWhats}
                defaultValue={selectedWhats}
                allowCreateNew
                modalPopover
                hideSelectAll
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-edit-how">
                {blogI18nText[language].how}
              </Label>
              <MultiSelect
                id="blog-edit-how"
                options={tags?.howTags ?? []}
                onValueChange={setSelectedHows}
                defaultValue={selectedHows}
                allowCreateNew
                modalPopover
                hideSelectAll
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleEditBlogDialogOpen(false)}
              >
                {blogI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateBlog().then(() => handleEditBlogDialogOpen(false));
                }}
                disabled={!blogName.trim() || updateBlogMutation.isPending}
              >
                {blogI18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
