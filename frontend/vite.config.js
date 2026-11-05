import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.VITE_API_PROXY || 'http://localhost:4000';

/**
 * GitHub Pages has no server-side routing: a deep link such as /hair-saloon/staff/stats
 * would get GitHub's 404 page. Pages serves 404.html for unknown paths, so a copy of
 * index.html there boots the app and React Router shows the right screen.
 */
const spaFallback = () => ({
  name: 'spa-404-fallback',
  apply: 'build',
  closeBundle() {
    const out = resolve(__dirname, 'dist');
    copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'));
  },
});

export default defineConfig({
  // "/" locally; the Pages workflow sets VITE_BASE=/hair-saloon/
  base: process.env.VITE_BASE || '/',
  plugins: [react(), spaFallback()],
  server: { port: 5173, proxy: { '/api': API } },
  preview: { port: 4173, proxy: { '/api': API } },
});
