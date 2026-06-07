import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: 'diskus-iframe-html',
    closeBundle() {
      const buildId = Date.now().toString(36);
      const template = readFileSync(resolve(__dirname, 'public/iframe.html'), 'utf-8');
      const html = template.replace(
        '<script src="./app.js"></script>',
        `<script src="./app.js?v=${buildId}"></script>`
      );
      writeFileSync(resolve(__dirname, 'dist/iframe.html'), html);
    },
  }],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false, // Don't empty outDir since vite.config.ts will run first
    lib: {
      entry: 'src/embed.ts',
      name: 'DiskusEmbed',
      fileName: () => 'embed.js',
      formats: ['iife'], // output immediately invoked function expression
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
