const CACHE_NAME = 'word-guess-cache-v18';
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

// Push notification handlers
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received:', event);
  
  let notificationData = {
    title: 'Dunham Wordle',
    body: 'You have a new notification',
    icon: '/dunhamwordle/vite.svg',
    badge: '/dunhamwordle/vite.svg',
    tag: 'wordle-notification',
    requireInteraction: false
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {}
      };
    } catch (err) {
      console.error('[Service Worker] Error parsing push data:', err);
    }
  }
  
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data
    }
  );
  
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dunhamwordle/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
