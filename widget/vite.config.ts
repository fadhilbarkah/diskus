import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [preact(), cssInjectedByJsPlugin(), tailwindcss()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.tsx',
      name: 'DiskusApp',
      fileName: () => 'app.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
    minify: 'esbuild',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
