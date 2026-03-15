import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index-journal.css";
import App from "./JournalApp.tsx";
import { CloseActionProvider } from "./close-action-provider";
import { initMediaServerBaseUrl } from "@/lib/utils";

async function bootstrap() {
  await initMediaServerBaseUrl();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <CloseActionProvider>
        <App />
      </CloseActionProvider>
    </StrictMode>,
  );
}

void bootstrap();
