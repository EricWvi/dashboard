import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index-journal.css";
import App from "./JournalApp.tsx";
import { CloseActionProvider } from "./close-action-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CloseActionProvider>
      <App />
    </CloseActionProvider>
  </StrictMode>,
);
