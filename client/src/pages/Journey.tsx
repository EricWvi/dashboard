import { columns } from "@/components/react-table/watched-columns";
import { DataTable } from "@/components/react-table/data-table";
import { useWatches, WatchStatus } from "@/hooks/use-watches";

export default function Journey() {
  const { data: watches } = useWatches(WatchStatus.COMPLETED);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Dive and Explore!
          </h2>
        </div>
      </div>
      <DataTable data={watches ?? []} columns={columns} />
    </div>
  );
}
