import { QueryClientProvider } from "@tanstack/react-query";
import Flomo from "@/pages/Flomo";
import { queryClient } from "@/lib/queryClient";
import { flomoDatabase } from "@/lib/flomo/db-interface";
import { UserProviderV2 } from "./user-provider";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProviderV2
        getUserFn={() => {
          return flomoDatabase.getUser();
        }}
      >
        <Flomo />
      </UserProviderV2>
    </QueryClientProvider>
  );
}
