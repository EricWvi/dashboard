import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  type Table as RTable,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WatchedTableToolbar,
  ToWatchTableToolbar,
  BookmarkTableToolbar,
} from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar: "towatch" | "watched" | "bookmark";
  isLoading: boolean;
  defaultPageSize: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  isLoading,
  defaultPageSize,
}: DataTableProps<TData, TValue>) {
  const isMobile = useIsMobile();
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const [showLoading, setShowLoading] = React.useState(true); // controls animation
  React.useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    }
  }, [isLoading]);

  const getTagsFacetedUniqueValues = (
    table: RTable<TData>,
    columnId: string,
  ) => {
    if (columnId !== "what" && columnId !== "how") {
      return getFacetedUniqueValues()(table as RTable<unknown>, columnId);
    }
    return () => {
      const map = new Map<string, number>();
      table
        .getColumn(columnId)
        ?.getFacetedRowModel()
        .rows.forEach((row) => {
          const tags = row.getValue(columnId) as string[];
          tags.forEach((tag) => {
            map.set(tag, (map.get(tag) ?? 0) + 1);
          });
        });
      return map;
    };
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: (updater) => {
      // When filters change, reset pageIndex to 0
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      // Update filters
      setColumnFilters(updater);
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    getFacetedUniqueValues:
      toolbar === "bookmark"
        ? getTagsFacetedUniqueValues
        : getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className={`${isMobile ? "px-6" : ""}`}>
        {toolbar === "towatch" && <ToWatchTableToolbar table={table} />}
        {toolbar === "watched" && <WatchedTableToolbar table={table} />}
        {toolbar === "bookmark" && <BookmarkTableToolbar table={table} />}
      </div>

      <div
        className={`overflow-hidden rounded-md ${!isMobile ? "border" : ""}`}
      >
        <Table className={`${isMobile ? "mr-2 ml-6" : ""}`}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        ...(header.column.columnDef.size
                          ? { width: header.column.columnDef.size }
                          : {}),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showLoading ? (
              <>
                {Array.from({ length: defaultPageSize }).map((_, index) =>
                  table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={index}>
                      {headerGroup.headers.map((header) => {
                        return (
                          (!header.column.columnDef.size ||
                            header.column.columnDef.size > 20) && (
                            <TableCell
                              key={header.id}
                              colSpan={header.colSpan}
                              style={{
                                ...(header.column.columnDef.size
                                  ? { width: header.column.columnDef.size }
                                  : {}),
                              }}
                            >
                              <Skeleton className="h-8 rounded-md" />
                            </TableCell>
                          )
                        );
                      })}
                    </TableRow>
                  )),
                )}
              </>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
