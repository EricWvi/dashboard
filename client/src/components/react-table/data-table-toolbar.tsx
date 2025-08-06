import { type Table } from "@tanstack/react-table";
import { CalendarIcon, Clapperboard, X } from "lucide-react";

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
import { DataTableViewOptions } from "./data-table-view-options";

import { types, ratings } from "@/components/react-table/watched-columns";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { useState } from "react";
import { useCreateWatch, WatchStatus, WatchType } from "@/hooks/use-watches";
import { dateString, todayStart } from "@/lib/utils";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const createEntryMutation = useCreateWatch();
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [datepickerOpen, setDatepickerOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType>(WatchType.MOVIE);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryRate, setEntryRate] = useState<number>(8);
  const [entryMarkInput, setEntryMarkInput] = useState("");
  const [entryMark, setEntryMark] = useState<Date | undefined>(undefined);

  const handleAddEntryDialogOpen = () => {
    setEntryName("");
    setEntryType(WatchType.MOVIE);
    setEntryYear(undefined);
    setEntryRate(8);
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
      rate: rate * 2, // Assuming rate is a value between 0 and 10, we double it for the API
      createdAt,
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Filter watches..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
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
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <Button size="sm" className="px-4" onClick={handleAddEntryDialogOpen}>
          <Clapperboard />
          Add
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
                <Label>Name</Label>
                <Input
                  placeholder="Enter entry name..."
                  value={entryName}
                  disabled={createEntryMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Year</Label>
                <Input
                  placeholder="Enter entry year..."
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
                <Label>Type</Label>
                <Select
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select entry type" />
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
                <Label>Mark</Label>
                <div className="relative">
                  <Input
                    placeholder="Enter completed date..."
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
              <Label>Rating: {entryRate.toFixed(1)}</Label>
              <Slider
                defaultValue={[16]}
                max={20}
                step={1}
                onValueChange={(value) => setEntryRate(value[0] / 2)}
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
