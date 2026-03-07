import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "public-flomo",
  build: {
    outDir: "flomo",
    rollupOptions: {
      input: path.resolve(__dirname, "flomo.html"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5273,
    proxy: {
      "/api": {
        target: "http://localhost:8765",
        changeOrigin: true,
        secure: false,
        headers: {
          "Remote-Email": "test@onlyquant.top",
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "flomo-mock",
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
          if (req.url?.includes("/api/flomo") && req.url?.includes("Action=Full")) {
            const mockData = fs.readFileSync(
              path.resolve(__dirname, "mock/flomo.json"),
              "utf-8"
            );
            res.setHeader("Content-Type", "application/json");
            res.end(mockData);
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
