import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    strictPort: true,
    watch: {
      ignored: ["**/release/**", "**/release-v*/**", "**/dist/**"],
    },
    proxy: {
      "/api": "http://127.0.0.1:5174",
      "/assets": "http://127.0.0.1:5174",
      "/gsi": "http://127.0.0.1:5174",
    },
  },
});
