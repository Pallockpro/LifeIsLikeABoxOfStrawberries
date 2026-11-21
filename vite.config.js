import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Source lives in app/. `npm run build` outputs to dist/, then scripts/publish.mjs
// copies the built site to the repo root so GitHub Pages (main branch, root) serves it.
export default defineConfig({
  root: 'app',
  plugins: [react()],
  base: process.env.BASE_PATH || '/LifeIsLikeABoxOfStrawberries/',
  build: { outDir: '../dist', emptyOutDir: true },
});
