import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Project Pages serve under /<repo>/. Gated by env so local dev, preview, and
  // e2e keep serving at root. PAGES_BASE lets CI override the subpath for PR
  // preview deploys (e.g. "/pack-it-play-it/pr-preview/pr-1/").
  base: process.env.PAGES_BASE ?? (process.env.GITHUB_PAGES ? "/pack-it-play-it/" : "/"),
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
