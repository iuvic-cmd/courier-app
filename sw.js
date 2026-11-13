const CACHE_NAME = 'uchot-v1';
const ASSETS = [
  './',
  './index.html',
  './fin.html',
  './cash.html',
  './stats.html',
  './settings.html',
  './css/theme.css',
  './css/components.css',
  './js/lib/storage.js',
  './js/lib/ui.js',
  './js/lib/notify.js',
  './js/lib/guard.js',
  './js/lib/theme.js',
  './js/domain/state.js',
  './js/domain/tariff.js',
  './js/domain/schedule.js',
  './js/domain/finance-api.js',
  './js/domain/ledger.js',
  './manifest.json',
  './icon-512.png'
];

// Установка: кэшируем все файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Перехват запросов: сначала сеть, потом кэш
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
