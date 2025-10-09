import {
  useUpdateWatch,
  WatchStatus,
  type Watch,
  WatchEnum,
  type WatchType,
  WatchMeasureEnum,
  useCompleteWatch,
  WatchTypeText,
  type WatchMeasure,
  WatchMeasureText,
} from "@/hooks/use-watches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { types } from "@/components/react-table/data-table-columns";
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
  MessageSquareQuote,
  TextQuote,
} from "lucide-react";
import { dateString, formatMediaUrl } from "@/lib/utils";
import { fileUpload } from "@/lib/file-upload";
import { useTTContext } from "@/components/editor";
import { createTiptap } from "@/hooks/use-draft";
import WatchCheckpoints from "@/components/watch-checkpoint";
import { BasicCannon, CannonMix, SchoolPride } from "@/lib/confetti";
import { useUserContext } from "@/user-provider";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";

const i18nText = {
  [UserLangEnum.ZHCN]: {
    reading: "阅读",
    playing: "游玩",
    watching: "观看",
    done: "标记已阅",
    continue: "继续",
    updateProgress: "更新进度",
    update: "更新",
    cancel: "取消",
    editEntry: "编辑条目",
    name: "名称",
    namePlaceholder: "输入名称...",
    year: "年份",
    yearPlaceholder: "输入年份...",
    type: "类别",
    typePlaceholder: "选择类别...",
    link: "链接",
    linkPlaceholder: "输入链接...",
    measure: "进度单位",
    range: "总量",
    measureRangePlaceholder: "输入进度总量...",
    progress: "进度：",
    review: "评论",
    completeWatch: "标记完成",
    rating: "评分：",
  },
  [UserLangEnum.ENUS]: {
    reading: "Reading",
    playing: "Playing",
    watching: "Watching",
    done: "Done",
    continue: "Continue ",
    updateProgress: "Update Watching Progress",
    update: "Update",
    cancel: "Cancel",
    editEntry: "Edit Watching Entry",
    name: "Name",
    namePlaceholder: "Enter entry name...",
    year: "Year",
    yearPlaceholder: "Enter entry year...",
    type: "Type",
    typePlaceholder: "Select entry type",
    link: "Link",
    linkPlaceholder: "Enter entry link...",
    measure: "Measure",
    range: "Range",
    measureRangePlaceholder: "Enter measure range...",
    progress: "Progress: ",
    review: "Review",
    completeWatch: "Complete Watch",
    rating: "Rating: ",
  },
};

const progressText = (watch: Watch, language: UserLang) => {
  if (watch.payload.measure === WatchMeasureEnum.PERCENTAGE) {
    return "";
  }
  if (language === UserLangEnum.ZHCN) {
    return `第 ${watch.payload.progress} / ${watch.payload.range} ${WatchMeasureText[watch.payload.measure as WatchMeasure][language]}`;
  } else if (language === UserLangEnum.ENUS) {
    return `${WatchMeasureText[watch.payload.measure as WatchMeasure][language]} ${watch.payload.progress} of ${watch.payload.range}`;
  }
  return "";
};

const WatchingItem = ({ watch }: { watch: Watch }) => {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const type = types.find((type) => type.value === watch.type);
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();

  const updateWatchMutation = useUpdateWatch([WatchStatus.WATCHING]);
  const dropWatchMutation = useUpdateWatch([
    WatchStatus.WATCHING,
    WatchStatus.DROPPED,
  ]);
  const completeWatchMutation = useCompleteWatch();
  const updateWatch = () => {
    return updateWatchMutation.mutateAsync({
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
  };
  const archiveWatch = () => {
    return dropWatchMutation.mutateAsync({
      id: watch.id,
      status: WatchStatus.DROPPED,
      payload: {
        ...watch.payload,
        checkpoints: [
          ...(watch.payload.checkpoints ?? []),
          [dateString(new Date(), "-"), -1],
        ],
      },
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
    handleUpdateProgressOpen(false);
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
    handleUpdateProgressOpen(false);
  };
  const updateProgress = () => {
    // if today already have progress, update it
    let curr: [string, number][] = watch.payload.checkpoints ?? [];
    let range = measureRange;
    if (entryMeasure === WatchMeasureEnum.PERCENTAGE) {
      range = 100;
    }
    if (curr.length > 0) {
      const today = dateString(new Date(), "-");
      if (curr[curr.length - 1][0] === today) {
        curr[curr.length - 1][1] = watchProgress;
      } else {
        if (curr[curr.length - 1][1] !== watchProgress) {
          curr.push([today, watchProgress]);
        }
      }
    }
    return updateWatchMutation.mutateAsync({
      id: watch.id,
      payload: {
        ...watch.payload,
        measure:
          entryMeasure === "" ? WatchMeasureEnum.PERCENTAGE : entryMeasure,
        range: range >= watchProgress ? range : watchProgress,
        progress: watchProgress,
        checkpoints: curr,
      },
    });
  };
  const completeWatch = () => {
    return completeWatchMutation.mutateAsync({ id: watch.id, rate: entryRate });
  };

  // update progress
  const [updateProgressOpen, setUpdateProgressOpen] = useState(false);
  const [entryMeasure, setEntryMeasure] = useState<WatchMeasure | "">("");
  const [measureRange, setMeasureRange] = useState<number>(0);
  const [watchProgress, setWatchProgress] = useState<number>(0);
  const handleUpdateProgressOpen = (open: boolean) => {
    if (open) {
      setEntryMeasure((watch.payload.measure as WatchMeasure) ?? "");
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
                {WatchTypeText[watch.type][language]}
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
                  {progressText(watch, language)}
                </span>
                <span className="text-sm font-medium">
                  {(
                    ((watch.payload.progress ?? 0) * 100) /
                    (watch.payload.range ?? 100)
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <Progress
                value={
                  ((watch.payload.progress ?? 0) * 100) /
                  (watch.payload.range ?? 100)
                }
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
                  {[WatchEnum.BOOK, WatchEnum.MANGA].includes(watch.type) ? (
                    <BookOpen />
                  ) : watch.type === WatchEnum.GAME ? (
                    <Swords />
                  ) : (
                    <Play />
                  )}
                  {i18nText[language].continue}
                  {[WatchEnum.BOOK, WatchEnum.MANGA].includes(watch.type)
                    ? i18nText[language].reading
                    : watch.type === WatchEnum.GAME
                      ? i18nText[language].playing
                      : i18nText[language].watching}
                </Button>
              </a>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleCompleteWatchOpen(true)}
              >
                <TicketCheck />
                {i18nText[language].done}
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
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <DialogHeader>
            <DialogTitle>{i18nText[language].editEntry}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-name">
                  {i18nText[language].name}
                </Label>
                <Input
                  id="watching-edit-watch-name"
                  placeholder={
                    !isMobile ? i18nText[language].namePlaceholder : ""
                  }
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-year">
                  {i18nText[language].year}
                </Label>
                <Input
                  id="watching-edit-watch-year"
                  placeholder={
                    !isMobile ? i18nText[language].yearPlaceholder : ""
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

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-edit-watch-type">
                  {i18nText[language].type}
                </Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watching-edit-watch-type"
                      placeholder={
                        !isMobile ? i18nText[language].typePlaceholder : ""
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
                <Label htmlFor="watching-edit-watch-link">
                  {i18nText[language].link}
                </Label>
                <Input
                  id="watching-edit-watch-link"
                  placeholder={
                    !isMobile ? i18nText[language].linkPlaceholder : ""
                  }
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
                    id="watching-edit-watch-img"
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
              <Button
                variant="secondary"
                onClick={() => {
                  archiveWatch().then(() => handleEditEntryDialogOpen(false));
                }}
              >
                <Package2 />
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditEntryDialogOpen(false)}
                >
                  {i18nText[language].cancel}
                </Button>
                <Button
                  onClick={() => {
                    updateWatch().then(() => handleEditEntryDialogOpen(false));
                  }}
                  disabled={!entryName.trim() || updateWatchMutation.isPending}
                >
                  {i18nText[language].update}
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
            <DialogTitle>{i18nText[language].updateProgress}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watching-update-progress-measure">
                  {i18nText[language].measure}
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
                      placeholder={
                        !isMobile ? i18nText[language].typePlaceholder : ""
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
                <Label htmlFor="watching-update-progress-range">
                  {i18nText[language].range}
                </Label>
                <Input
                  id="watching-update-progress-range"
                  placeholder={
                    !isMobile ? i18nText[language].measureRangePlaceholder : ""
                  }
                  value={
                    entryMeasure === WatchMeasureEnum.PERCENTAGE
                      ? 100
                      : measureRange
                  }
                  disabled={
                    entryMeasure === WatchMeasureEnum.PERCENTAGE ||
                    updateWatchMutation.isPending
                  }
                  onChange={(e) => setMeasureRange(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-4">
              <Label htmlFor="watching-edit-watch-progress">
                {i18nText[language].progress}
                {watchProgress}
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
                  max={measureRange ?? 100}
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

            {/* checkpoints display */}
            <WatchCheckpoints
              measure={watch.payload.measure as WatchMeasure}
              checkpoints={watch.payload.checkpoints ?? []}
            />

            <div className="flex justify-between gap-2">
              <div className="space-x-2">
                {watch.type === WatchEnum.BOOK && (
                  <Button variant="secondary" onClick={editQuotes}>
                    <TextQuote />
                  </Button>
                )}
                <Button variant="secondary" onClick={reviewWatch}>
                  <MessageSquareQuote />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateProgressOpen(false)}
                >
                  {i18nText[language].cancel}
                </Button>
                <Button
                  onClick={() => {
                    updateProgress().then(() =>
                      handleUpdateProgressOpen(false),
                    );
                  }}
                  disabled={updateWatchMutation.isPending}
                >
                  {i18nText[language].update}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* complete watch dialog */}
      <Dialog open={completeWatchOpen} onOpenChange={handleCompleteWatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].completeWatch}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="mb-6 flex flex-col gap-4">
              <Label htmlFor="watching-complete-watch-rating">
                {i18nText[language].rating}
                {(entryRate / 2).toFixed(1)}
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
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  completeWatch().then(() => {
                    handleCompleteWatchOpen(false);
                    if (watch.payload.checkpoints) {
                      const start = new Date(watch.payload.checkpoints[0][0]);
                      const end = new Date();
                      const diffTime = Math.abs(
                        end.getTime() - start.getTime(),
                      );
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      if (diffDays >= 60) {
                        SchoolPride();
                      } else if (diffDays >= 30) {
                        CannonMix();
                      } else {
                        BasicCannon();
                      }
                    }
                  });
                }}
                disabled={completeWatchMutation.isPending}
              >
                {i18nText[language].update}
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
      className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isMobile ? "mx-6" : "pb-10"}`}
    >
      {watches.map((watch) => (
        <WatchingItem key={watch.id} watch={watch} />
      ))}
    </div>
  );
};
