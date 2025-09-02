import { DataTable } from "@/components/react-table/data-table";
import { blogColumns } from "@/components/react-table/data-table-columns";
import { useBlogs } from "@/hooks/use-blogs";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Blog() {
  const isMobile = useIsMobile();
  const { data: blogs, isPending } = useBlogs();
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
          <h2 className="text-3xl font-semibold">Blog</h2>
        </div>
      </div>

      <DataTable
        data={blogs ?? []}
        columns={blogColumns}
        toolbar="blog"
        isPending={isPending}
        defaultPageSize={defaultPageSize}
      />
    </div>
  );
}
