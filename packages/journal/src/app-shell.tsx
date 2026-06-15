import "./styles.css";
import type { ContractsClient } from "@only/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { TTOverlayProvider } from "@/components/editor";
import { OverlayController } from "@/components/overlay-controller";
import { syncDraft, getContent } from "@/hooks/journal/use-tiptapv2";
import { UserProviderV2 } from "@only/platform";
import Journal from "@/pages/Journal";
import { TiptapProvider } from "@/editor-provider";
import { EntryEditor } from "@/components/journal/entry-editor";

interface AppShellProps {
  client: ContractsClient;
}

export function AppShell({ client }: AppShellProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProviderV2 getUserFn={() => client.getUser({}).then((r) => r.user)}>
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
