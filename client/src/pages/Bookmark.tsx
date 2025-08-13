import { DataTable } from "@/components/react-table/data-table";
import { bookmarkColumns } from "@/components/react-table/data-table-columns";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Bookmark() {
  const isMobile = useIsMobile();
  const { data: bookmarks } = useBookmarks();

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
        isLoading={bookmarks ? false : true} // Show loading state if data is not available
      />
    </div>
  );
}
