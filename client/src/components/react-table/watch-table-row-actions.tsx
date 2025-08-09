"use client";

import { type Row } from "@tanstack/react-table";
import { CalendarIcon, MoreHorizontal } from "lucide-react";

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

import { types } from "@/components/react-table/watched-columns";
import {
  useDeleteWatch,
  useUpdateWatch,
  WatchStatus,
  WatchType,
  type Watch,
} from "@/hooks/use-watches";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateString, todayStart } from "@/lib/utils";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function WatchTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const isMobile = useIsMobile();
  const watch = row.original as Watch;
  const [entryName, setEntryName] = useState("");
  const [entryType, setEntryType] = useState<WatchType | undefined>(undefined);
  const [entryYear, setEntryYear] = useState<number | undefined>(undefined);
  const [entryRate, setEntryRate] = useState<number>(8);
  const [entryMarkInput, setEntryMarkInput] = useState("");
  const [entryMark, setEntryMark] = useState<Date | undefined>(undefined);
  const [datepickerOpen, setDatepickerOpen] = useState(false);
  const updateWatchMutation = useUpdateWatch();
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
      setEntryRate(watch.rate / 2);
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
                <Label>Name</Label>
                <Input
                  placeholder={!isMobile ? "Enter entry name..." : ""}
                  value={entryName}
                  disabled={updateWatchMutation.isPending}
                  onChange={(e) => setEntryName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Year</Label>
                <Input
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
                <Label>Type</Label>
                <Select
                  value={entryType}
                  onValueChange={(v: string) => setEntryType(v as WatchType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
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
                <Label>Mark</Label>
                <div className="relative">
                  <Input
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
                    rate: entryRate * 2,
                    createdAt: entryMark ?? todayStart(),
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
