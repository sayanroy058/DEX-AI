import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Local dev has no Vercel edge runtime for api/prices.ts, so proxy
      // straight to price-fetcher here (server-to-server, no CORS applies).
      // Production uses the /api/prices serverless function instead.
      "/api/prices": {
        target: "https://price-fetcher-api.onrender.com",
        changeOrigin: true,
        rewrite: () => "/healthz",
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
