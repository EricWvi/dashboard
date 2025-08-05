import TabbedApp from "@/components/tabbed-app";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";
import { KanbanProvider, KanbanWrapper } from "@/components/kanban";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TTProvider>
        <KanbanProvider>
          <TabbedApp />
          <SimpleEditorWrapper />
          <KanbanWrapper />
        </KanbanProvider>
      </TTProvider>
    </QueryClientProvider>
  );
}
