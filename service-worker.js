const CACHE_NAME = 'meu-financeiro-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './dom.js',
  './storage.js',
  './finance.js',
  './charts.js',
  './eventEmitter.js',
  './config.js',
  './manifest.json',
  './favicon.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './images/screenshot1.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação e cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

// Estratégia de busca: cache primeiro, depois rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
