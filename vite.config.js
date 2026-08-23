import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  },
  test: {
    environment: 'node',
    globals: true
  }
});
