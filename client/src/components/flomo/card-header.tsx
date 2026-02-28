import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { EditorToolbar } from "@/components/tiptap-editor/simple-editor";
import { useAppState } from "@/hooks/flomo/use-app-state";

export function CardHeader() {
  const { activeTabId } = useAppState();

  if (!activeTabId) return null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <EditorToolbar />
      </div>
    </header>
  );
}
