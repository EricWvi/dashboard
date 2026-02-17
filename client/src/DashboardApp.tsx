import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import TabbedApp from "@/components/tabbed-app";
import SignUp from "@/components/sign-up";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";
import { KanbanProvider, KanbanWrapper } from "@/components/kanban";
import { Toaster } from "@/components/ui/sonner";
import { UserLangEnum } from "@/hooks/use-user";
import SearchCommand from "@/components/search-command";
import { UserProvider, useUserContext } from "@/user-provider";
import { useEffect } from "react";

const MainPage = () => {
  const { user } = useUserContext();
  const {
    needRefresh: [needRefresh, _] = [false, () => {}],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("Service Worker registered", r);
    },
    onRegisterError(error) {
      console.error("Service Worker registration failed", error);
    },
  });
  useEffect(() => {
    if (needRefresh) {
      toast(i18nText[user.language].newVersion, {
        action: {
          label: i18nText[user.language].update,
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity, // stays open until user acts
      });
    }
  }, [needRefresh]);

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

const i18nText = {
  [UserLangEnum.ZHCN]: {
    newVersion: "🚀 新版本已就绪！",
    update: "更新",
  },
  [UserLangEnum.ENUS]: {
    newVersion: "🚀 A new version is available!",
    update: "Update",
  },
};
