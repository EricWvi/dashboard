import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./DashboardApp.tsx";
import { initMediaServerBaseUrl } from "@/lib/utils";

async function bootstrap() {
  await initMediaServerBaseUrl();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
