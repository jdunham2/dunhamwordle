import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin to copy word files and update service worker
    {
      name: 'copy-word-files-and-update-sw',
      writeBundle() {
        const outDir = 'docs';
        const wordFiles = [
          'wordle-answers-alphabetical.txt',
          'wordle-allowed-guesses.txt'
        ];

        // Copy word files
        wordFiles.forEach(file => {
          const srcPath = resolve(file);
          const destPath = resolve(outDir, file);
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath);
            console.log(`Copied ${file} to ${outDir}/`);
          }
        });

        // Copy and update service worker with current asset names
        const assetsDir = resolve(outDir, 'assets');
        if (existsSync(assetsDir)) {
          const assetFiles = readdirSync(assetsDir);
          const swContent = `const CACHE_NAME = 'word-guess-cache-v3';

// Core files that should always be cached
const coreUrlsToCache = [
  './',
  './index.html',
  './wordle-allowed-guesses.txt',
  './wordle-answers-alphabetical.txt'
];

// Dynamic asset files (updated on each build)
const assetFiles = ${JSON.stringify(assetFiles.map(f => `./assets/${f}`), null, 2)};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache core files first
        return cache.addAll(coreUrlsToCache).then(() => {
          // Then cache all assets
          return cache.addAll(assetFiles).catch(err => {
            console.log('Some assets failed to cache:', err);
            // Don't fail the entire cache operation if some assets fail
          });
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`;

          writeFileSync(resolve(outDir, 'sw.js'), swContent);
          console.log('Updated service worker with current asset files');
        }
      }
    }
  ],
  // Use relative base to support deployment to subdirectories (like GitHub Pages).
  base: './',
  build: {
    outDir: 'docs',
  },
});
