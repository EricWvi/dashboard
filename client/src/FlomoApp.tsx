import { QueryClientProvider } from "@tanstack/react-query";
import Flomo from "@/pages/Flomo";
import { queryClient } from "@/lib/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Flomo />
    </QueryClientProvider>
  );
}
