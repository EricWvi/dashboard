"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { Rating, WatchEnum, type Watch } from "@/hooks/use-watches";
import { type Bookmark, clickBookmark, Domain } from "@/hooks/use-bookmarks";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./data-table-column-header";
import {
  BookmarkTableRowActions,
  ToWatchTableRowActions,
  WatchedTableRowActions,
} from "./watch-table-row-actions";

import {
  Brush,
  CloudSun,
  CircleDollarSign,
  Cpu,
  Clapperboard,
  Gamepad2,
  Handshake,
  HeartPulse,
  HandFist,
  LibraryBig,
  MountainSnow,
  Palette,
  Projector,
  Puzzle,
  School,
  Sparkle,
  Sparkles,
  Star,
  StarOff,
  Tv,
} from "lucide-react";
import { dateString } from "@/lib/utils";

export const ratings = [
  {
    value: Rating.Five,
    icon: Sparkles,
  },
  {
    value: Rating.Four,
    icon: Sparkle,
  },
  {
    value: Rating.Three,
    icon: Star,
  },
  {
    value: Rating.Two,
    icon: Star,
  },
  {
    value: Rating.One,
    icon: StarOff,
  },
  {
    value: Rating.Zero,
    icon: StarOff,
  },
];

export const types = [
  {
    value: WatchEnum.MOVIE,
    icon: Projector,
  },
  {
    value: WatchEnum.SERIES,
    icon: Clapperboard,
  },
  {
    value: WatchEnum.DOCUMENTARY,
    icon: Tv,
  },
  {
    value: WatchEnum.BOOK,
    icon: LibraryBig,
  },
  {
    value: WatchEnum.GAME,
    icon: Gamepad2,
  },
  {
    value: WatchEnum.MANGA,
    icon: Brush,
  },
];

export const domains = [
  {
    value: Domain.TEC,
    icon: Cpu,
  },
  {
    value: Domain.KNL,
    icon: School,
  },
  {
    value: Domain.HEA,
    icon: HeartPulse,
  },
  {
    value: Domain.PER,
    icon: HandFist,
  },
  {
    value: Domain.SOC,
    icon: Handshake,
  },
  {
    value: Domain.LIF,
    icon: CloudSun,
  },
  {
    value: Domain.BUS,
    icon: CircleDollarSign,
  },
  {
    value: Domain.ART,
    icon: Palette,
  },
  {
    value: Domain.ENV,
    icon: MountainSnow,
  },
  {
    value: Domain.MIS,
    icon: Puzzle,
  },
];

export const watchedColumns: ColumnDef<Watch>[] = [
  {
    accessorKey: "type",
    size: 300,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" className="ml-2" />
    ),
    cell: ({ row }) => {
      const type = types.find((type) => type.value === row.getValue("type"));

      if (!type) {
        return null;
      }

      return (
        <div className="ml-2 flex items-center gap-2">
          <type.icon className="text-muted-foreground size-4" />
          <span>{type.value}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    size: 600,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <span
            className="max-w-[600px] truncate font-medium"
            title={row.getValue("title") + " (" + row.original.year + ")"}
          >
            {row.getValue("title")}{" "}
            <span className="text-muted-foreground">
              {"(" + row.original.year + ")"}
            </span>
            {(row.original.payload.epoch ?? 1) > 1 && (
              <Badge variant="outline" className="ml-2">
                {row.original.payload.epoch === 2
                  ? "2nd"
                  : row.original.payload.epoch === 3
                    ? "3rd"
                    : row.original.payload.epoch + "th"}
              </Badge>
            )}
          </span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "rate",
    accessorFn: (row) => ratings[Math.ceil((20 - Number(row.rate)) / 4)].value,
    size: 300,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rate" />
    ),
    cell: ({ row }) => {
      const rating = ratings[Math.ceil((20 - Number(row.original.rate)) / 4)];

      return (
        <div className="flex items-center gap-2">
          {rating && <rating.icon className="text-muted-foreground size-4" />}
          <span>{(Number(row.original.rate) / 2).toFixed(1)}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    accessorFn: (row) => String(new Date(row.createdAt).getFullYear()),
    size: 300,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mark" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center gap-2">
          <span>{dateString(row.original.createdAt)}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    size: 20,
    cell: ({ row }) => <WatchedTableRowActions row={row} />,
  },
];

export const towatchColumns: ColumnDef<Watch>[] = [
  {
    accessorKey: "type",
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" className="ml-2" />
    ),
    cell: ({ row }) => {
      const type = types.find((type) => type.value === row.getValue("type"));

      if (!type) {
        return null;
      }

      return (
        <div className="ml-2 flex items-center gap-2">
          <type.icon className="text-muted-foreground size-4" />
          <span>{type.value}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    size: 200,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <span
            className="max-w-[600px] truncate font-medium"
            title={row.getValue("title") + " (" + row.original.year + ")"}
          >
            {row.getValue("title")}{" "}
            {row.original.year !== 2099 && (
              <span className="text-muted-foreground">
                {"(" + row.original.year + ")"}
              </span>
            )}
            {(row.original.payload.epoch ?? 1) > 1 && (
              <Badge variant="outline" className="ml-2">
                {row.original.payload.epoch === 2
                  ? "2nd"
                  : row.original.payload.epoch === 3
                    ? "3rd"
                    : row.original.payload.epoch + "th"}
              </Badge>
            )}
          </span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    size: 20,
    cell: ({ row }) => <ToWatchTableRowActions row={row} />,
  },
];

export const bookmarkColumns: ColumnDef<Bookmark>[] = [
  {
    accessorKey: "domain",
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Domain" className="ml-2" />
    ),
    cell: ({ row }) => {
      const type = domains.find(
        (domain) => domain.value === row.getValue("domain"),
      );

      if (!type) {
        return null;
      }

      return (
        <div className="ml-2 flex items-center gap-2">
          <type.icon className="text-muted-foreground size-4" />
          <span>{type.value}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    size: 200,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <a
            className="max-w-[600px] truncate font-medium underline decoration-1"
            href={row.original.url}
            target="_blank"
            onClick={() => clickBookmark(row.original.id)}
          >
            {row.getValue("title")}
          </a>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "what",
    accessorFn: (row) => row.payload.whats ?? [],
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="What" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          {row.original.payload.whats?.map((what: string, idx: number) => (
            <Badge key={idx} variant="outline">
              {what}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: (row, _id, value) => {
      return value.every((item: string) =>
        row.original.payload.whats?.includes(item),
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "how",
    accessorFn: (row) => row.payload.hows ?? [],
    size: 150,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="How" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          {row.original.payload.hows?.map((what: string, idx: number) => (
            <Badge key={idx} variant="secondary">
              {what}
            </Badge>
          ))}
        </div>
      );
    },
    filterFn: (row, _id, value) => {
      return value.every((item: string) =>
        row.original.payload.hows?.includes(item),
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    size: 20,
    cell: ({ row }) => <BookmarkTableRowActions row={row} />,
  },
];
