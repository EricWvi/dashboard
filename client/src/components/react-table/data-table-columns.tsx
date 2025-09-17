"use client";

import { type ColumnDef } from "@tanstack/react-table";

import {
  Rating,
  WatchEnum,
  WatchTypeText,
  type Watch,
} from "@/hooks/use-watches";
import { type Bookmark, clickBookmark, Domain } from "@/hooks/use-bookmarks";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "./data-table-column-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BlogTableRowActions,
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
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";
import { BlogEnum, BlogTypeText, type Blog } from "@/hooks/use-blogs";
import { useTTContext } from "@/components/editor";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

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

const i18nText = {
  [UserLangEnum.ZHCN]: {
    type: "类别",
    name: "名称",
    author: "作者",
    rate: "评分",
    mark: "标记日期",
    review: "评论",
    quotes: "书摘",
    domain: "领域",
    title: "标题",
    link: "链接",
    what: "一级标签",
    how: "二级标签",
    created: "创建时间",
    updated: "更新时间",
  },
  [UserLangEnum.ENUS]: {
    type: "Type",
    name: "Name",
    author: "Author",
    rate: "Rate",
    mark: "Mark",
    review: "Review",
    quotes: "Quotes",
    domain: "Domain",
    title: "Title",
    link: "Link",
    what: "What",
    how: "How",
    created: "Created",
    updated: "Updated",
  },
};

export const watchedColumns: ColumnDef<Watch>[] = [
  {
    accessorKey: "type",
    size: 300,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].type}
          className="ml-2"
        />
      );
    },
    cell: ({ row }) => {
      const { language } = useUserContext();
      const type = types.find((type) => type.value === row.getValue("type"));

      if (!type) {
        return null;
      }

      return (
        <div className="ml-2 flex items-center gap-2">
          <type.icon className="text-muted-foreground size-4" />
          <span>{WatchTypeText[type.value][language]}</span>
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].name}
        />
      );
    },
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
    filterFn: (row, _id, value) => {
      return (
        row.original.title.toLowerCase().includes(value) ||
        row.original.author.toLowerCase().includes(value)
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "author",
    size: 500,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].author}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <span
            className="max-w-[500px] truncate font-medium"
            title={row.getValue("author")}
          >
            {row.getValue("author")}
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].rate}
        />
      );
    },
    cell: ({ row }) => {
      const { language } = useUserContext();
      const rating = ratings[Math.ceil((20 - Number(row.original.rate)) / 4)];

      return (
        <div className="flex items-center gap-2">
          {rating && <rating.icon className="text-muted-foreground size-4" />}
          <span>{(Number(row.original.rate) / 2).toFixed(1)}</span>

          {/* display quotes content */}
          {row.original.payload.quotes && (
            <Dialog>
              <DialogTrigger>
                <div className="cursor-pointer font-medium underline decoration-1">
                  {i18nText[language].quotes.toLowerCase()}
                </div>
              </DialogTrigger>
              <DialogContent
                className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
                onOpenAutoFocus={(e) => {
                  e.preventDefault(); // stops Radix from focusing anything
                  (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
                }}
              >
                <DialogHeader>
                  <DialogTitle>{i18nText[language].quotes}</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <ContentHtml id={row.original.payload.quotes ?? 0} />
              </DialogContent>
            </Dialog>
          )}

          {/* display review content */}
          {row.original.payload.review && (
            <Dialog>
              <DialogTrigger>
                <div className="cursor-pointer font-medium underline decoration-1">
                  {i18nText[language].review.toLowerCase()}
                </div>
              </DialogTrigger>
              <DialogContent
                className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
                onOpenAutoFocus={(e) => {
                  e.preventDefault(); // stops Radix from focusing anything
                  (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
                }}
              >
                <DialogHeader>
                  <DialogTitle>{i18nText[language].review}</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <ContentHtml id={row.original.payload.review ?? 0} />
              </DialogContent>
            </Dialog>
          )}
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].mark}
        />
      );
    },
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].type}
          className="ml-2"
        />
      );
    },
    cell: ({ row }) => {
      const { language } = useUserContext();
      const type = types.find((type) => type.value === row.getValue("type"));

      if (!type) {
        return null;
      }

      return (
        <div className="ml-2 flex items-center gap-2">
          <type.icon className="text-muted-foreground size-4" />
          <span>{WatchTypeText[type.value][language]}</span>
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
    size: 300,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].name}
        />
      );
    },
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
    filterFn: (row, _id, value) => {
      return (
        row.original.title.toLowerCase().includes(value) ||
        row.original.author.toLowerCase().includes(value)
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "author",
    size: 250,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].author}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          <span
            className="max-w-[500px] truncate font-medium"
            title={row.getValue("author")}
          >
            {row.getValue("author")}
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].domain}
          className="ml-2"
        />
      );
    },
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].title}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          {row.original.payload.draft || row.original.url === "" ? (
            <div className="max-w-[500px] truncate font-medium">
              {row.getValue("title")}
            </div>
          ) : (
            <a
              className="max-w-[500px] truncate font-medium"
              href={row.original.url}
              target="_blank"
              onClick={() => clickBookmark(row.original.id)}
            >
              {row.getValue("title")}
            </a>
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "url",
    size: 300,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].link}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
          {row.original.payload.draft ? (
            <Dialog>
              <DialogTrigger onClick={() => clickBookmark(row.original.id)}>
                <div className="cursor-pointer font-medium underline decoration-1">
                  cheatsheet
                </div>
              </DialogTrigger>
              <DialogContent
                className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
                onOpenAutoFocus={(e) => {
                  e.preventDefault(); // stops Radix from focusing anything
                  (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
                }}
              >
                <DialogHeader>
                  <DialogTitle>{row.original.title}</DialogTitle>
                  <DialogDescription></DialogDescription>
                </DialogHeader>
                <ContentHtml id={row.original.payload.draft ?? 0} />
              </DialogContent>
            </Dialog>
          ) : (
            <a
              className="max-w-[600px] truncate font-medium underline decoration-1"
              href={row.original.url}
              target="_blank"
              onClick={() => clickBookmark(row.original.id)}
            >
              {row.getValue("url")}
            </a>
          )}
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].what}
        />
      );
    },
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader column={column} title={i18nText[language].how} />
      );
    },
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

export const blogColumns: ColumnDef<Blog>[] = [
  {
    accessorKey: "createdAt",
    size: 150,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].created}
          className="ml-2"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="ml-2 flex items-center gap-2">
          <span>{dateString(row.original.createdAt)}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    size: 300,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].title}
        />
      );
    },
    cell: ({ row }) => {
      const { language } = useUserContext();
      const { setId: setEditorId, setOpen: setEditorDialogOpen } =
        useTTContext();

      return (
        <div className="flex gap-2">
          <div className="max-w-[600px] truncate font-medium">
            <span
              className="cursor-pointer"
              onClick={() => {
                setEditorId(row.original.draft);
                setEditorDialogOpen(true);
              }}
            >
              {row.getValue("title")}
            </span>
            <Badge
              variant={
                row.original.visibility === BlogEnum.PUBLIC
                  ? "outline"
                  : "secondary"
              }
              className="ml-2"
            >
              {BlogTypeText[row.original.visibility][language]}
            </Badge>
          </div>
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].what}
        />
      );
    },
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
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader column={column} title={i18nText[language].how} />
      );
    },
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
    accessorKey: "updatedAt",
    size: 150,
    header: ({ column }) => {
      const { language } = useUserContext();
      return (
        <DataTableColumnHeader
          column={column}
          title={i18nText[language].updated}
          className="ml-2"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <div className="ml-2 flex items-center gap-2">
          <span>{dateString(row.original.updatedAt)}</span>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    size: 20,
    cell: ({ row }) => <BlogTableRowActions row={row} />,
  },
];
