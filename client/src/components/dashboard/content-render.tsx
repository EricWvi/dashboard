import { useDraft } from "@/hooks/dashboard/use-tiptapv2";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadOnlyTiptap } from "@/components/tiptap-editor/simple-editor";

export function ContentRender({ id }: { id: string }) {
  const isMobile = useIsMobile();
  const { data: draft, isFetching } = useDraft(id);
  const [showLoading, setShowLoading] = useState(true);
  useEffect(() => {
    if (!isFetching) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    } else {
      setShowLoading(true);
    }
  }, [isFetching]);

  return (
    <div
      className={`overflow-scroll ${isMobile ? "h-[70vh] max-h-[70vh]" : "h-[80vh] max-h-[80vh] w-full px-4"}`}
    >
      {showLoading ? (
        <div className="mx-auto mt-6 max-w-[870px] space-y-4">
          <Skeleton className="h-8 w-40 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
          <Skeleton className="h-8 w-30 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
        </div>
      ) : (
        <ReadOnlyTiptap draft={draft?.content} />
      )}
    </div>
  );
}
