import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";

// Strip IE6/7 star-hack properties (e.g. `*zoom: 1`) from odometer's CSS so
// esbuild doesn't warn about invalid syntax during minification.
function stripOdometerStarHacks(): Plugin {
  return {
    name: "strip-odometer-star-hacks",
    transform(code, id) {
      if (id.includes("odometer") && id.endsWith(".css")) {
        return { code: code.replace(/^\s*\*[a-zA-Z-]+\s*:[^;]+;/gm, "") };
      }
    },
  };
}

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
          "Onlyquant-Token":
            "xnkjsZpkmMEXrTFPvTWgT1OM+YGyDKhU3OhxVks4rAv6mp92Vw9bXGRGdRufYw==",
        },
      },
    },
  },
  plugins: [react(), tailwindcss(), stripOdometerStarHacks()],
  resolve: {
    alias: {
      "@only/contracts": path.resolve(__dirname, "../packages/contracts/dist/index.js"),
      "@only/editor": path.resolve(__dirname, "../packages/editor/src/index.ts"),
      "@only/ui": path.resolve(__dirname, "../packages/ui/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
