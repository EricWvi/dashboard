import TabbedApp from "@/components/tabbed-app";
import SignUp from "@/components/sign-up";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";
import { KanbanProvider, KanbanWrapper } from "@/components/kanban";
import { Toaster } from "@/components/ui/sonner";
import { useUser } from "@/hooks/use-user";

const MainPage = () => {
  const { data: userInfo } = useUser();
  return (
    <>{userInfo && (userInfo.username === "" ? <SignUp /> : <TabbedApp />)}</>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TTProvider>
        <KanbanProvider>
          <MainPage />
          <SimpleEditorWrapper />
          <KanbanWrapper />
          <Toaster position="top-right" />
        </KanbanProvider>
      </TTProvider>
    </QueryClientProvider>
  );
}
