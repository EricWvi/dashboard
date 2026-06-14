import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createContractsClient } from "@only/contracts";
import { createFetchTransport } from "@only/contracts/fetch";
import { AppShell } from "@only/journal";

const client = createContractsClient(createFetchTransport());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppShell client={client} />
  </StrictMode>,
);
