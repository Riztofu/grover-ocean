import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  // `vite build --mode qollab`: relative asset paths, single un-hashed bundle (see qollab/build.sh)
  base: mode === "qollab" ? "./" : "/",
  build:
    mode === "qollab"
      ? {
        outDir: "../qollab/package/assets",
        emptyOutDir: true,
        rollupOptions: {
          output: {
            entryFileNames: "app.js",
            chunkFileNames: "chunk-[name].js",
            assetFileNames: "[name][extname]",
          },
        },
        }
      : undefined,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward API calls to the FastAPI/Qiskit backend
      "/api": "http://localhost:8000",
    },
  },
}));
