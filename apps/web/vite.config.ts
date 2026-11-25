import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
    // La API y la sesión (cookies de Better Auth) quedan en el mismo origen durante el desarrollo.
    proxy: { "/api": { target: "http://localhost:8000", changeOrigin: false } },
  },
});
