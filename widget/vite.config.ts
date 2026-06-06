import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [preact(), cssInjectedByJsPlugin(), tailwindcss()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    lib: {
      entry: 'src/index.tsx',
      name: 'DiskusWidget',
      fileName: () => 'embed.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: true,
    cssCodeSplit: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        unsafe: true,
      },
      format: {
        comments: false,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
