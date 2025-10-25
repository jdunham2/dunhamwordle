const CACHE_NAME = 'word-guess-cache-v17';
const GHPATH = '/dunhamwordle';

// Core files that should always be cached
const coreUrlsToCache = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/manifest.json`,
  `${GHPATH}/vite.svg`,
  `${GHPATH}/wordle-allowed-guesses.txt`,
  `${GHPATH}/wordle-answers-alphabetical.txt`,
  `${GHPATH}/audio/mom-awesome.mp3`,
  `${GHPATH}/audio/mom-you-did-it.mp3`
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(coreUrlsToCache).catch(err => {
          console.log('Some core files failed to cache:', err);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle requests within our scope
  if (!event.request.url.includes(GHPATH)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          // If fetch fails, try to serve index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(`${GHPATH}/index.html`);
          }
        });
      })
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
