import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index-journal.css";
import App from "./JournalApp.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
