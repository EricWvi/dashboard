import { useAppState } from "@/hooks/flomo/use-app-state";
import { SimpleEditor } from "../tiptap-editor/simple-editor";

export function CardContent() {
  const { activeTabId } = useAppState();

  if (!activeTabId) return null;

  return (
    <div className="transform-gpu">
      <SimpleEditor />
    </div>
  );
}
