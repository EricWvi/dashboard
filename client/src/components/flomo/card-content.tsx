import { useAppState } from "@/hooks/flomo/use-app-state";
import { useDraft } from "@/hooks/flomo/use-tiptapv2";
import { SimpleEditor } from "../tiptap-editor/simple-editor";

export function CardContent() {
  const { activeTabId } = useAppState();
  const { data: draft } = useDraft(activeTabId || "");

  if (!draft) {
    return null;
  }

  return (
    <div className="transform-gpu">
      <SimpleEditor draft={draft} onClose={() => {}} />
    </div>
  );
}
