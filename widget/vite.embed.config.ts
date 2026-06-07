import { defineConfig } from 'vite';

export default defineConfig({
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
