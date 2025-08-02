import TabbedApp from "@/components/tabbed-app";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TTProvider>
        <TabbedApp />
        <SimpleEditorWrapper />
      </TTProvider>
    </QueryClientProvider>
  );
}
