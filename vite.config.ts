/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  server: {
    host: "0.0.0.0",
    port: 5000, // Vite dev server port - must be 5000 for Replit webview
    allowedHosts: true, // Allow all hosts for Replit webview
    proxy: {
      // Proxy API requests to the backend server
      "/api": {
        target: "http://0.0.0.0:8080", // Backend runs on port 8080
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
  },
});
