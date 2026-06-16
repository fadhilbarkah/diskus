/// <reference types="vitest" />

import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  publicDir: false,
  build: {
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/embed.tsx",
      name: "DiskusEmbed",
      fileName: () => "embed.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 3,
        drop_console: true,
        drop_debugger: true,
        pure_getters: true,
      },
      format: {
        comments: false,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  test: {
    environment: "happy-dom",
    coverage: {
      include: ["src/lib/**"],
      thresholds: { lines: 80 },
    },
  },
});
