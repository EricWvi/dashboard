"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { Rating, WatchType, type Watch } from "@/hooks/use-watches";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";

import {
  Brush,
  Clapperboard,
  Gamepad2,
  LibraryBig,
  Projector,
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
    value: WatchType.MOVIE,
    icon: Projector,
  },
  {
    value: WatchType.SERIES,
    icon: Clapperboard,
  },
  {
    value: WatchType.DOCUMENTARY,
    icon: Tv,
  },
  {
    value: WatchType.BOOK,
    icon: LibraryBig,
  },
  {
    value: WatchType.GAME,
    icon: Gamepad2,
  },
  {
    value: WatchType.MANGA,
    icon: Brush,
  },
];

export const columns: ColumnDef<Watch>[] = [
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
    size: 300,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mark" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex w-[100px] items-center gap-2">
          <span>{dateString(row.getValue("createdAt"))}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    size: 20,
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
