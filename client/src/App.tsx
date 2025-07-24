import TabbedApp from "@/components/tabbed-app";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TabbedApp />
    </QueryClientProvider>
  );
}
