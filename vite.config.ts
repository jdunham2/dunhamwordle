import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base to support deployment to subdirectories (like GitHub Pages).
  base: './',
  build: {
    outDir: 'docs',
  },
});
