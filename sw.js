const CACHE_NAME = 'uchot-v6';
const ASSETS = [
  './',
  './index.html',
  './fin.html',
  './cash.html',
  './stats.html',
  './plan.html',
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
  './icon-512.PNG' // регистр важен: на GitHub Pages имя файла в верхнем регистре
];

// Установка: кэшируем файлы по одному, чтобы один недоступный файл не ломал установку
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('SW: не закэшировано', url, err)))
      ))
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

// Сначала сеть (в обход HTTP-кэша браузера), при ошибке — кэш
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
