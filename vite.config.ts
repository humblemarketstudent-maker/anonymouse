import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const port = Number(process.env.PORT) || 43123;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    proxy: {
      "/api/moderation": {
        target: process.env.MODERATION_ORIGIN ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/api/auth": {
        target: process.env.AUTH_ORIGIN ?? "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
});
