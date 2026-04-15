import { ReadOnlyTiptap } from "@/components/tiptap-editor/simple-editor";
import { useDraft as useLegacyDraft } from "@/hooks/use-draft";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import { useQuery } from "@tanstack/react-query";

const isUuid = (value: string) => value.includes("-");

export function ContentRender({ id }: { id: string | number }) {
  const idStr = String(id);
  const legacyId = Number(idStr);
  const useLegacy = Number.isFinite(legacyId) && legacyId > 0 && !isUuid(idStr);
  const { data: legacyDraft, isFetching: legacyFetching } = useLegacyDraft(
    useLegacy ? legacyId : 0,
  );
  const { data: v2Draft, isFetching: v2Fetching } = useQuery({
    queryKey: ["dashboard", "tiptap", idStr],
    queryFn: async () => dashboardDatabase.getTiptap(idStr),
    enabled: !!idStr && !useLegacy,
  });

  if (legacyFetching || v2Fetching) return null;
  return (
    <div className="w-full">
      <ReadOnlyTiptap draft={legacyDraft?.content ?? v2Draft?.content} />
    </div>
  );
}

export function ContentHTML({ id }: { id: string | number }) {
  return <ContentRender id={id} />;
}

export { ReadOnlyTiptap };
