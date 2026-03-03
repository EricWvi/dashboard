import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "public-journal",
  build: {
    outDir: "journal",
    rollupOptions: {
      input: path.resolve(__dirname, "journal.html"),
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
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
