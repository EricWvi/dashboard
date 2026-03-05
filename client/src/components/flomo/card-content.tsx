import { useEditorState } from "@/hooks/use-editor-state";
import { SimpleEditor } from "../tiptap-editor/simple-editor";

export function CardContent() {
  const { activeTabId } = useEditorState();

  if (!activeTabId) return null;

  return (
    <div className="transform-gpu">
      <SimpleEditor />
    </div>
  );
}
