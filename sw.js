const CACHE_NAME = 'word-guess-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './vite.svg',
  './App.css',
  './types.ts',
  './services/wordService.ts',
  './hooks/useKeyPress.ts',
  './App.tsx',
  './components/AdBanner.tsx',
  './components/Grid.tsx',
  './components/Row.tsx',
  './components/Tile.tsx',
  './components/Keyboard.tsx',
  './components/Boosts.tsx',
  './wordle-allowed-guesses.txt',
  './wordle-answers-alphabetical.txt',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/lucide-react@^0.546.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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