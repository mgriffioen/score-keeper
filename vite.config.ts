import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` is overridable so the same build works on GitHub Pages
// (/<repo>/) and on a root-level host (/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { host: true },
});
