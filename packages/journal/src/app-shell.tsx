import "./styles.css";
import type { ContractsClient } from "@only/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TTOverlayProvider } from "@/components/editor";
import { OverlayController } from "@/components/overlay-controller";
import { syncDraft, getContent } from "@/hooks/journal/use-tiptapv2";
import { UserProviderV2 } from "@/user-provider";
import Journal from "@/pages/Journal";
import { journalDatabase } from "@/lib/journal/db-interface";
import { TiptapProvider } from "@/editor-provider";
import { EntryEditor } from "@/components/journal/entry-editor";

interface AppShellProps {
  client: ContractsClient;
}

export function AppShell({ client }: AppShellProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProviderV2
        getUserFn={() => {
          return journalDatabase.getUser();
        }}
      >
        <TTOverlayProvider>
          <TiptapProvider persistence={{ syncDraft, getContent }}>
            <OverlayController />
            <Journal />
            <EntryEditor />
          </TiptapProvider>
        </TTOverlayProvider>
      </UserProviderV2>
    </QueryClientProvider>
  );
}
