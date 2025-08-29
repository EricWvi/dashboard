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

const MainPage = () => {
  const { user } = useUserContext();
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      console.log("Service Worker registered", r);
    },
    onRegisterError(error) {
      console.error("Service Worker registration failed", error);
    },
  });
  if (needRefresh) {
    toast(
      <div className="flex flex-col gap-2">
        <p>{i18nText[user.language].newVersion}</p>
        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-1 text-white"
            onClick={() => updateServiceWorker(true)}
          >
            {i18nText[user.language].update}
          </button>
          <button
            className="rounded bg-gray-300 px-3 py-1"
            onClick={() => toast.dismiss()} // just close the toast
          >
            {i18nText[user.language].later}
          </button>
        </div>
      </div>,
      {
        duration: Infinity, // stays open until user acts
      },
    );
  }

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
    later: "稍后",
  },
  [UserLangEnum.ENUS]: {
    newVersion: "🚀 A new version is available!",
    update: "Update",
    later: "Later",
  },
};
