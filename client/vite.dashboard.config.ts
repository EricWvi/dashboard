import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
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
          "Onlyquant-Token":
            "xnkjsZpkmMEXrTFPvTWgT1OM+YGyDKhU3OhxVks4rAv6mp92Vw9bXGRGdRufYw==",
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@only/app-context": path.resolve(__dirname, "../packages/app-context/src/index.ts"),
      "@only/contracts": path.resolve(__dirname, "../packages/contracts/dist/index.js"),
      "@only/editor": path.resolve(__dirname, "../packages/editor/src/index.ts"),
      "@only/ui": path.resolve(__dirname, "../packages/ui/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
