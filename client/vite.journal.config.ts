import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

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
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50 MB
        skipWaiting: false, // Important: don't auto-skip waiting
        clientsClaim: false, // Important: don't auto-claim clients
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
          "fonts/**/*.{woff,woff2,ttf,otf}",
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Journal App",
        short_name: "Journal",
        description:
          "Capture and write about the details of everyday moments and special events.",
        background_color: "#0a0913",
        theme_color: "#0a0913",
        display: "standalone",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
