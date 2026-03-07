import TabbedApp from "@/components/dashboard/tabbed-app";
import SignUp from "@/components/dashboard/sign-up";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";
import {
  KanbanProvider,
  KanbanWrapper,
} from "@/components/dashboard/todo/kanban";
import { Toaster } from "@/components/ui/sonner";
import SearchCommand from "@/components/dashboard/search-command";
import { UserProvider, useUserContext } from "@/user-provider";

const MainPage = () => {
  const { user } = useUserContext();

  return user.username === "" ? <SignUp /> : <TabbedApp />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TTProvider>
          <KanbanProvider>
            <MainPage />
            <SimpleEditorWrapper />
            <KanbanWrapper />
            <Toaster position="top-right" />
            <SearchCommand />
          </KanbanProvider>
        </TTProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

