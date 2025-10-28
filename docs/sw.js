const CACHE_NAME = 'word-guess-cache-v3';

// Core files that should always be cached
const coreUrlsToCache = [
  './',
  './index.html',
  './wordle-allowed-guesses.txt',
  './wordle-answers-alphabetical.txt',
  './audio/mom-awesome.mp3',
  './audio/mom-you-did-it.mp3'
];

// Dynamic asset files (updated on each build)
const assetFiles = [
  "./assets/index-BwvGxbNA.css",
  "./assets/index-C51dFp_r.js"
];

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
});