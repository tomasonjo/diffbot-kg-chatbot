import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  preview: {
    port: 8502,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://api:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    cors: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    origin: "http://localhost:3000",
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://0.0.0.0:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    cors: false,
  },
  plugins: [react()],
});
