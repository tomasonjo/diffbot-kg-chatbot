// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://api:8000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    watch: {
      usePolling: true,
    },
    cors: false,
  },
  optimizeDeps: {
    exclude: [
      'chunk-QZIGV62A.js?v=fa23f911',
      'chunk-DYQIOKDO.js?v=fa23f911',
    ],
  },
  plugins: [react()],
});
