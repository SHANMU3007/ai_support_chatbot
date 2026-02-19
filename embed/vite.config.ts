/// <reference types="node" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.tsx"),
      name: "ChatBotAIWidget",
      fileName: "embed",
      formats: ["iife"],
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
        // Bundle React into the output so the widget is self-contained
        globals: {},
      },
    },
    minify: "terser",
    outDir: "../frontend/public",
    emptyOutDir: false,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
