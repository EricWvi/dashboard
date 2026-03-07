import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTProvider, SimpleEditorWrapper } from "@/components/editor";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/user-provider";
import Journal from "@/pages/Journal";
import { useCloseActionContext } from "./close-action-provider";

const MainPage = () => {
  return <Journal />;
};

export default function App() {
  const { onClose } = useCloseActionContext();
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TTProvider>
          <MainPage />
          <SimpleEditorWrapper
            showToast={false}
            removeCache={false}
            onClose={onClose}
          />
          <Toaster position="top-right" />
        </TTProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

