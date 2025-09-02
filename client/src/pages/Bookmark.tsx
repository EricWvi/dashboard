import { DataTable } from "@/components/react-table/data-table";
import { bookmarkColumns } from "@/components/react-table/data-table-columns";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Bookmark() {
  const isMobile = useIsMobile();
  const { data: bookmarks, isPending } = useBookmarks();
  // compute default pageSize on mobile
  const defaultPageSize =
    window.innerWidth < 768
      ? Math.min(Math.floor((window.innerHeight - 292) / 50), 10)
      : 10;

  return (
    <div
      className={`flex size-full flex-col gap-4 ${isMobile ? "pt-6" : "p-8"}`}
    >
      <div
        className={`flex items-center justify-between gap-2 ${isMobile ? "px-6" : ""}`}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-semibold">Bookmark</h2>
        </div>
      </div>

      <DataTable
        data={bookmarks ?? []}
        columns={bookmarkColumns}
        toolbar="bookmark"
        isPending={isPending}
        defaultPageSize={defaultPageSize}
      />
    </div>
  );
}
