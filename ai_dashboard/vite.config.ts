
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    proxy: {
      "/api": {
        target: "https://api.consultara.co.in",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: { host: "0.0.0.0", port: 4173, strictPort: true, allowedHosts: ["dashboard.consultara.co.in"] },
});
