import { type Table } from "@tanstack/react-table";
import { CalendarIcon, Clapperboard, Plus, X } from "lucide-react";

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

import { types, ratings } from "@/components/react-table/watch-columns";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useState } from "react";
import {
  useCreateToWatch,
  useCreateWatched,
  WatchStatus,
  WatchEnum,
  type WatchType,
} from "@/hooks/use-watches";
import { dateString, todayStart } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function WatchedTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
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

  const handleAddEntryDialogOpen = () => {
    setEntryName("");
    setEntryType(WatchEnum.MOVIE);
    setEntryYear(undefined);
    setEntryRate(16);
    setEntryMarkInput("");
    setEntryMark(undefined);
    setDatepickerOpen(false);
    setAddEntryDialogOpen(true);
  };

  const createEntry = async (
    title: string,
    type: WatchType,
    status: WatchStatus,
    year: number,
    rate: number,
    createdAt: Date,
  ) => {
    await createEntryMutation.mutateAsync({
      title,
      type,
      status,
      year,
      rate,
      createdAt,
      payload: {},
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder="Filter watches..."
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
            title="Type"
            options={types}
          />
        )}
        {table.getColumn("rate") && (
          <DataTableFacetedFilter
            column={table.getColumn("rate")}
            title="Rate"
            options={ratings}
          />
        )}
        {table.getColumn("createdAt") && (
          <DataTableFacetedFilter
            column={table.getColumn("createdAt")}
            title="Year"
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
            <span className={`${isMobile ? "hidden" : ""}`}>Reset</span>
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
              Add
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
            <DialogTitle>Add Watched Entry</DialogTitle>
            <DialogDescription>
              Stay up to date with the entries that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-name">Name</Label>
                <Input
                  id="watched-add-watch-name"
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-year">Year</Label>
                <Input
                  id="watched-add-watch-year"
                  placeholder={!isMobile ? "Enter entry year..." : ""}
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="watched-add-watch-type">Type</Label>
                <Select
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="watched-add-watch-type"
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
                <Label htmlFor="watched-add-watch-mark">Mark</Label>
                <div className="relative">
                  <Input
                    id="watched-add-watch-mark"
                    placeholder={!isMobile ? "Enter completed date..." : ""}
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
            <div className="mb-6 flex flex-col gap-2">
              <Label htmlFor="watched-add-watch-rating">
                Rating: {(entryRate / 2).toFixed(1)}
              </Label>
              <Slider
                id="watched-add-watch-rating"
                defaultValue={[16]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0])}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddEntryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createEntry(
                    entryName,
                    entryType,
                    WatchStatus.COMPLETED,
                    entryYear ?? new Date().getFullYear(),
                    entryRate,
                    entryMark ?? todayStart(),
                  );
                  setAddEntryDialogOpen(false);
                }}
                disabled={!entryName.trim() || createEntryMutation.isPending}
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

export function ToWatchTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
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

  const handleAddEntryDialogOpen = () => {
    setEntryName("");
    setEntryType(WatchEnum.MOVIE);
    setEntryYear(undefined);
    setEntryLink("");
    setAddEntryDialogOpen(true);
  };

  const createEntry = async (
    title: string,
    type: WatchType,
    status: WatchStatus,
    year: number,
    link: string,
  ) => {
    await createEntryMutation.mutateAsync({
      title,
      type,
      status,
      year,
      payload: { link },
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!isMobile && (
          <Input
            placeholder="Filter watches..."
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
            title="Type"
            options={types}
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
            <span className={`${isMobile ? "hidden" : ""}`}>Reset</span>
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
              Add
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
            <DialogTitle>Add ToWatch Entry</DialogTitle>
            <DialogDescription>
              Stay up to date with the entries that matter most to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-name">Name</Label>
                <Input
                  id="towatch-add-watch-name"
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-year">Year</Label>
                <Input
                  id="towatch-add-watch-year"
                  placeholder={!isMobile ? "Enter entry year..." : ""}
                  type="number"
                  min={1900}
                  max={2099}
                  value={entryYear}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryYear(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="towatch-add-watch-type">Type</Label>
                <Select
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      id="towatch-add-watch-type"
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
                <Label htmlFor="towatch-add-watch-link">Link</Label>
                <Input
                  id="towatch-add-watch-link"
                  placeholder={!isMobile ? "Enter entry link..." : ""}
                  type="text"
                  value={entryLink}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryLink(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddEntryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  createEntry(
                    entryName,
                    entryType,
                    WatchStatus.PLAN_TO_WATCH,
                    entryYear ?? 0,
                    entryLink,
                  );
                  setAddEntryDialogOpen(false);
                }}
                disabled={!entryName.trim() || createEntryMutation.isPending}
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
