import { type Table } from "@tanstack/react-table";
import { MultiSelect } from "@/components/multi-select";
import {
  CalendarIcon,
  Clapperboard,
  LetterText,
  Link2,
  Plus,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  ratings,
  domains,
  types,
} from "@/components/react-table/data-table-columns";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useState, useMemo } from "react";
import {
  useCreateToWatch,
  useCreateWatched,
  WatchStatus,
  WatchEnum,
  type WatchType,
  WatchTypeText,
  RatingText,
} from "@/hooks/use-watches";
import { dateString, todayStart } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Domain,
  useCreateBookmark,
  useTags,
  type DomainType,
} from "@/hooks/use-bookmarks";
import { createTiptap } from "@/hooks/use-draft";
import { useCreateBlog } from "@/hooks/use-blogs";
import { useUserContext } from "@/user-provider";
import { UserLangEnum } from "@/hooks/use-user";

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function WatchedTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isFiltered = table.getState().columnFilters.length > 0;
  const createEntryMutation = useCreateWatched();
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [datepickerOpen, setDatepickerOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType>(WatchEnum.MOVIE);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryRate, setEntryRate] = useState<number>(16);
  const [entryMarkInput, setEntryMarkInput] = useState("");
  const [entryMark, setEntryMark] = useState<Date | undefined>(undefined);
  const [entryAuthor, setEntryAuthor] = useState<string>("");

  const handleAddEntryDialogOpen = () => {
    setEntryName("");
    setEntryType(WatchEnum.MOVIE);
    setEntryYear(undefined);
    setEntryRate(16);
    setEntryMarkInput("");
    setEntryMark(undefined);
    setEntryAuthor("");
    setDatepickerOpen(false);
    setAddEntryDialogOpen(true);
  };

  const createEntry = async () => {
    return createEntryMutation.mutateAsync({
      title: entryName,
      type: entryType,
      status: WatchStatus.COMPLETED,
      year: entryYear ?? new Date().getFullYear(),
      rate: entryRate,
      createdAt: entryMark ?? todayStart(),
      payload: {},
      author: entryAuthor,
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder={WatchI18nText[language].searchPlaceholder}
            value={searchTerm}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                table.getColumn("title")?.setFilterValue(searchTerm);
              }
            }}
            className="h-8 w-[283px]"
          />
        )}

        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title={WatchI18nText[language].type}
            options={types}
            getOptionLabel={(value) => WatchTypeText[value][language]}
          />
        )}
        {table.getColumn("rate") && (
          <DataTableFacetedFilter
            column={table.getColumn("rate")}
            title={WatchI18nText[language].rate}
            options={ratings}
            getOptionLabel={(value) => RatingText[value][language]}
          />
        )}
        {table.getColumn("createdAt") && (
          <DataTableFacetedFilter
            column={table.getColumn("createdAt")}
            title={WatchI18nText[language].year}
            options={(() => {
              const column = table.getColumn("createdAt");
              const minMaxValues = column?.getFacetedMinMaxValues();
              const minValue = minMaxValues?.[0];
              return minValue
                ? Array.from(
                    { length: new Date().getFullYear() - minValue + 1 },
                    (_, i) => ({ value: String(new Date().getFullYear() - i) }),
                  )
                : [];
            })()}
            getOptionLabel={(value) => value}
          />
        )}
        {isFiltered && !isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <span>{WatchI18nText[language].reset}</span>
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* <DataTableViewOptions table={table} /> */}
        {isFiltered && isMobile ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <X />
          </Button>
        ) : (
          <Button size="sm" className="px-4" onClick={handleAddEntryDialogOpen}>
            {!isMobile ? (
              <>
                <Clapperboard />
                {WatchI18nText[language].add}
              </>
            ) : (
              <Plus />
            )}
          </Button>
        )}
      </div>

      {/* add watch entry dialog */}
      <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {WatchI18nText[language].addWatchedEntryTitle}
            </DialogTitle>
            <DialogDescription>
              {WatchI18nText[language].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-name">
                  {WatchI18nText[language].name}
                </Label>
                <Input
                  id="watched-add-watch-name"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryNamePlaceholder
                      : ""
                  }
                  value={entryName}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-author">
                  {WatchI18nText[language].author}
                </Label>
                <Input
                  id="watched-add-watch-author"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryAuthorPlaceholder
                      : ""
                  }
                  value={entryAuthor}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryAuthor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-type">
                  {WatchI18nText[language].type}
                </Label>
                <Select
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watched-add-watch-type"
                      placeholder={
                        !isMobile
                          ? WatchI18nText[language].entryTypePlaceholder
                          : ""
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
                <Label htmlFor="watched-add-watch-year">
                  {WatchI18nText[language].year}
                </Label>
                <Input
                  id="watched-add-watch-year"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryYearPlaceholder
                      : ""
                  }
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="mb-6 flex flex-col gap-2">
              <Label htmlFor="watched-add-watch-rating">
                {WatchI18nText[language].rating} {(entryRate / 2).toFixed(1)}
              </Label>
              <Slider
                id="watched-add-watch-rating"
                defaultValue={[16]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0])}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-mark">
                  {WatchI18nText[language].mark}
                </Label>
                <div className="relative">
                  <Input
                    id="watched-add-watch-mark"
                    placeholder={
                      !isMobile
                        ? WatchI18nText[language].completedDatePlaceholder
                        : ""
                    }
                    value={entryMarkInput}
                    disabled={createEntryMutation.isPending}
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
                          setEntryMark(date);
                          setEntryMarkInput(dateString(date));
                          setDatepickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddEntryDialogOpen(false)}
              >
                {WatchI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  createEntry().then(() => setAddEntryDialogOpen(false));
                }}
                disabled={!entryName.trim() || createEntryMutation.isPending}
              >
                {WatchI18nText[language].create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const WatchI18nText = {
  [UserLangEnum.ZHCN]: {
    rate: "评分",
    rating: "评分：",
    mark: "标记日期",
    add: "添加",
    reset: "重置",
    type: "类别",
    searchPlaceholder: "搜索",
    addEntryTitle: "添加想看",
    addWatchedEntryTitle: "添加已看",
    description: "记录重要的条目",
    name: "名称",
    entryNamePlaceholder: "输入名称...",
    author: "作者",
    entryAuthorPlaceholder: "输入作者...",
    entryType: "类别",
    entryTypePlaceholder: "选择类别",
    year: "年份",
    entryYearPlaceholder: "输入年份...",
    link: "链接",
    entryLinkPlaceholder: "输入链接...",
    cancel: "取消",
    create: "创建",
    completedDatePlaceholder: "输入标记日期",
  },
  [UserLangEnum.ENUS]: {
    rate: "Rate",
    rating: "Rating:",
    mark: "Mark",
    add: "Add",
    reset: "Reset",
    type: "Type",
    searchPlaceholder: "Filter watches...",
    addEntryTitle: "Add ToWatch Entry",
    addWatchedEntryTitle: "Add Watched Entry",
    description: "Stay up to date with the entries that matter most to you.",
    name: "Name",
    entryNamePlaceholder: "Enter entry name...",
    author: "Author",
    entryAuthorPlaceholder: "Enter entry author...",
    entryType: "Type",
    entryTypePlaceholder: "Select entry type",
    year: "Year",
    entryYearPlaceholder: "Enter entry year...",
    link: "Link",
    entryLinkPlaceholder: "Enter entry link...",
    cancel: "Cancel",
    create: "Create",
    completedDatePlaceholder: "Enter completed date...",
  },
};

export function ToWatchTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isFiltered = table.getState().columnFilters.length > 0;
  const createEntryMutation = useCreateToWatch();
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType>(WatchEnum.MOVIE);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryLink, setEntryLink] = useState<string>("");
  const [entryAuthor, setEntryAuthor] = useState<string>("");

  const handleAddEntryDialogOpen = () => {
    setEntryName("");
    setEntryType(WatchEnum.MOVIE);
    setEntryYear(undefined);
    setEntryLink("");
    setEntryAuthor("");
    setAddEntryDialogOpen(true);
  };

  const createEntry = async () => {
    return createEntryMutation.mutateAsync({
      title: entryName,
      type: entryType,
      status: WatchStatus.PLAN_TO_WATCH,
      year: entryYear ?? 0,
      payload: { link: entryLink, epoch: 1 },
      author: entryAuthor,
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder={WatchI18nText[language].searchPlaceholder}
            value={searchTerm}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                table.getColumn("title")?.setFilterValue(searchTerm);
              }
            }}
            className="h-8 w-[283px]"
          />
        )}

        {table.getColumn("type") && (
          <DataTableFacetedFilter
            column={table.getColumn("type")}
            title={WatchI18nText[language].type}
            options={types}
            getOptionLabel={(value) => WatchTypeText[value][language]}
          />
        )}
        {isFiltered && (
          <Button
            variant={`${isMobile ? "secondary" : "ghost"}`}
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <span className={`${isMobile ? "hidden" : ""}`}>
              {WatchI18nText[language].reset}
            </span>
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* <DataTableViewOptions table={table} /> */}
        <Button size="sm" className="px-4" onClick={handleAddEntryDialogOpen}>
          {!isMobile ? (
            <>
              <Clapperboard />
              {WatchI18nText[language].add}
            </>
          ) : (
            <Plus />
          )}
        </Button>
      </div>

      {/* add watch entry dialog */}
      <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{WatchI18nText[language].addEntryTitle}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-name">
                  {WatchI18nText[language].name}
                </Label>
                <Input
                  id="towatch-add-watch-name"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryNamePlaceholder
                      : ""
                  }
                  value={entryName}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-author">
                  {WatchI18nText[language].author}
                </Label>
                <Input
                  id="towatch-add-watch-author"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryAuthorPlaceholder
                      : ""
                  }
                  value={entryAuthor}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryAuthor(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-type">
                  {WatchI18nText[language].entryType}
                </Label>
                <Select
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-add-watch-type"
                      placeholder={
                        !isMobile
                          ? WatchI18nText[language].entryTypePlaceholder
                          : ""
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
                <Label htmlFor="towatch-add-watch-year">
                  {WatchI18nText[language].year}
                </Label>
                <Input
                  id="towatch-add-watch-year"
                  placeholder={
                    !isMobile
                      ? WatchI18nText[language].entryYearPlaceholder
                      : ""
                  }
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="towatch-add-watch-link">
                {WatchI18nText[language].link}
              </Label>
              <Input
                id="towatch-add-watch-link"
                placeholder={
                  !isMobile ? WatchI18nText[language].entryLinkPlaceholder : ""
                }
                type="text"
                value={entryLink}
                disabled={createEntryMutation.isPending}
                onChange={(e) => setEntryLink(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddEntryDialogOpen(false)}
              >
                {WatchI18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  createEntry().then(() => setAddEntryDialogOpen(false));
                }}
                disabled={!entryName.trim() || createEntryMutation.isPending}
              >
                {WatchI18nText[language].create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const bookmarkI18nText = {
  [UserLangEnum.ZHCN]: {
    domain: "领域",
    what: "一级标签",
    how: "二级标签",
    reset: "重置",
    add: "添加",
    searchPlaceholder: "搜索",
  },
  [UserLangEnum.ENUS]: {
    domain: "Domain",
    what: "What",
    how: "How",
    reset: "Reset",
    add: "Add",
    searchPlaceholder: "Filter bookmarks...",
  },
};

export function BookmarkTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const { data: tags } = useTags();

  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isFiltered = table.getState().columnFilters.length > 0;
  const createBookmarkMutation = useCreateBookmark();
  const [addBookmarkDialogOpen, setAddBookmarkDialogOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState("");
  const [bookmarkType, setBookmarkType] = useState<DomainType>(Domain.KNL);
  const [bookmarkLink, setBookmarkLink] = useState<string>("");
  const [selectedWhats, setSelectedWhats] = useState<string[]>([]);
  const [selectedHows, setSelectedHows] = useState<string[]>([]);

  const handleAddBookmarkDialogOpen = () => {
    setBookmarkName("");
    setBookmarkType(Domain.KNL);
    setBookmarkLink("");
    setSelectedWhats([]);
    setSelectedHows([]);
    setAddBookmarkDialogOpen(true);
  };

  const createBookmark = async (
    title: string,
    url: string,
    domain: DomainType,
    whats: string[],
    hows: string[],
  ) => {
    const draft = url !== "cheatsheet" ? 0 : await createTiptap();
    return createBookmarkMutation.mutateAsync({
      title,
      url,
      domain,
      payload: {
        whats,
        hows,
        draft,
      },
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder={bookmarkI18nText[language].searchPlaceholder}
            value={searchTerm}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                table.getColumn("title")?.setFilterValue(searchTerm);
              }
            }}
            className="h-8 w-[283px]"
          />
        )}

        {table.getColumn("domain") && (
          <DataTableFacetedFilter
            column={table.getColumn("domain")}
            title={bookmarkI18nText[language].domain}
            options={domains}
            getOptionLabel={(value) => value}
          />
        )}
        {table.getColumn("what") && (
          <DataTableFacetedFilter
            column={table.getColumn("what")}
            title={bookmarkI18nText[language].what}
            showEmptyFilter={false}
            options={tags?.whatTags ?? []}
            getOptionLabel={(value) => value}
          />
        )}
        {table.getColumn("how") && (
          <DataTableFacetedFilter
            column={table.getColumn("how")}
            title={bookmarkI18nText[language].how}
            showEmptyFilter={false}
            options={tags?.howTags ?? []}
            getOptionLabel={(value) => value}
          />
        )}
        {isFiltered && !isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <span>{bookmarkI18nText[language].reset}</span>
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* <DataTableViewOptions table={table} /> */}
        {isFiltered && isMobile ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <X />
          </Button>
        ) : (
          <Button
            size="sm"
            className="px-4"
            onClick={handleAddBookmarkDialogOpen}
          >
            {!isMobile ? (
              <>
                <Link2 />
                {bookmarkI18nText[language].add}
              </>
            ) : (
              <Plus />
            )}
          </Button>
        )}
      </div>

      {/* add bookmark dialog */}
      <Dialog
        open={addBookmarkDialogOpen}
        onOpenChange={setAddBookmarkDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
            <DialogDescription>
              Stay up to date with the bookmarks that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-add-name">Title</Label>
                <Input
                  id="bookmark-add-name"
                  placeholder={!isMobile ? "Enter bookmark title..." : ""}
                  value={bookmarkName}
                  disabled={createBookmarkMutation.isPending}
                  onChange={(e) => setBookmarkName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-add-domain">Domain</Label>
                <Select
                  onValueChange={(v: string) =>
                    setBookmarkType(v as DomainType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="bookmark-add-domain"
                      placeholder={!isMobile ? "Select domain" : ""}
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
                <Label htmlFor="bookmark-add-link">Link</Label>
                <Input
                  id="bookmark-add-link"
                  placeholder={!isMobile ? "Enter bookmark link..." : ""}
                  type="text"
                  value={bookmarkLink}
                  disabled={createBookmarkMutation.isPending}
                  onChange={(e) => setBookmarkLink(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-add-what">What</Label>
                <MultiSelect
                  id="bookmark-add-what"
                  placeholder=""
                  options={tags?.whatTags ?? []}
                  onValueChange={setSelectedWhats}
                  defaultValue={selectedWhats}
                  allowCreateNew
                  modalPopover
                  hideSelectAll
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="bookmark-add-how">How</Label>
                <MultiSelect
                  id="bookmark-add-how"
                  placeholder=""
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
                onClick={() => setAddBookmarkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createBookmark(
                    bookmarkName,
                    bookmarkLink,
                    bookmarkType,
                    selectedWhats,
                    selectedHows,
                  ).then(() => setAddBookmarkDialogOpen(false));
                }}
                disabled={
                  !bookmarkName.trim() || createBookmarkMutation.isPending
                }
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BlogTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isMobile = useIsMobile();
  const { data: tags } = useTags();

  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const isFiltered = table.getState().columnFilters.length > 0;
  const createBlogMutation = useCreateBlog();
  const [addBlogDialogOpen, setAddBlogDialogOpen] = useState(false);
  const [blogName, setBlogName] = useState("");
  const [selectedWhats, setSelectedWhats] = useState<string[]>([]);
  const [selectedHows, setSelectedHows] = useState<string[]>([]);

  const handleAddBlogDialogOpen = () => {
    setBlogName("");
    setSelectedWhats([]);
    setSelectedHows([]);
    setAddBlogDialogOpen(true);
  };

  const createBlog = async (title: string, whats: string[], hows: string[]) => {
    return createBlogMutation.mutateAsync({
      title,
      payload: {
        whats,
        hows,
      },
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder="Filter blogs..."
            value={searchTerm}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                table.getColumn("title")?.setFilterValue(searchTerm);
              }
            }}
            className="h-8 w-[283px]"
          />
        )}

        {table.getColumn("what") && (
          <DataTableFacetedFilter
            column={table.getColumn("what")}
            title="What"
            showEmptyFilter={false}
            options={tags?.whatTags ?? []}
          />
        )}
        {table.getColumn("how") && (
          <DataTableFacetedFilter
            column={table.getColumn("how")}
            title="How"
            showEmptyFilter={false}
            options={tags?.howTags ?? []}
          />
        )}
        {isFiltered && !isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <span>Reset</span>
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* <DataTableViewOptions table={table} /> */}
        {isFiltered && isMobile ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              table.resetColumnFilters();
            }}
          >
            <X />
          </Button>
        ) : (
          <Button size="sm" className="px-4" onClick={handleAddBlogDialogOpen}>
            {!isMobile ? (
              <>
                <LetterText />
                Add
              </>
            ) : (
              <Plus />
            )}
          </Button>
        )}
      </div>

      {/* add blog dialog */}
      <Dialog open={addBlogDialogOpen} onOpenChange={setAddBlogDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Blog</DialogTitle>
            <DialogDescription>
              Stay up to date with the blogs that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-add-name">Title</Label>
              <Input
                id="blog-add-name"
                placeholder={!isMobile ? "Enter blog title..." : ""}
                value={blogName}
                disabled={createBlogMutation.isPending}
                onChange={(e) => setBlogName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-add-what">What</Label>
              <MultiSelect
                id="blog-add-what"
                placeholder=""
                options={tags?.whatTags ?? []}
                onValueChange={setSelectedWhats}
                defaultValue={selectedWhats}
                allowCreateNew
                modalPopover
                hideSelectAll
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-add-how">How</Label>
              <MultiSelect
                id="blog-add-how"
                placeholder=""
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
                onClick={() => setAddBlogDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createBlog(blogName, selectedWhats, selectedHows).then(() =>
                    setAddBlogDialogOpen(false),
                  );
                }}
                disabled={!blogName.trim() || createBlogMutation.isPending}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
