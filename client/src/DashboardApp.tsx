import TabbedApp from "@/components/dashboard/tabbed-app";
import SignUp from "@/components/dashboard/sign-up";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTOverlayProvider } from "@/components/editor";
import {
  KanbanProvider,
  KanbanWrapper,
} from "@/components/dashboard/todo/kanban";
import SearchCommand from "@/components/dashboard/search-command";
import { UserProvider, useUserContext } from "@/user-provider";
import { TiptapProvider } from "./editor-provider";
import { getContent, syncDraft } from "@/hooks/dashboard/use-tiptapv2";

const MainPage = () => {
  const { user } = useUserContext();

  return user.username === "" ? <SignUp /> : <TabbedApp />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TTOverlayProvider>
          <TiptapProvider persistence={{ syncDraft, getContent }}>
            <KanbanProvider>
              <MainPage />
              <KanbanWrapper />
              <SearchCommand />
            </KanbanProvider>
          </TiptapProvider>
        </TTOverlayProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
