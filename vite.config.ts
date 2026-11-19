import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 10001,
    strictPort: true,
    proxy: {
      // changeOrigin must stay off so the backend's Origin/Host consistency
      // check sees the browser's original Host header.
      "/api": { target: "http://127.0.0.1:10002", changeOrigin: false },
    },
  },
});
