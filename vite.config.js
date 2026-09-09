import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  },
  plugins: [
    {
      name: 'copy-master-assets',
      closeBundle() {
        copyDirRecursive('Fav Icons', 'dist/Fav Icons');
        copyDirRecursive('background-sounds', 'dist/background-sounds');
        copyDirRecursive('gun-sounds', 'dist/gun-sounds');
        copyDirRecursive('Game Code/Json', 'dist/Game Code/Json');
      }
    }
  ],
  test: {
    environment: 'node',
    globals: true
  }
});
