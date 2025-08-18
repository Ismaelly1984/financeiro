// service-worker.js
const CACHE_NAME = 'meu-financeiro-cache-v4';

// Tudo com caminhos ABSOLUTOS para garantir o escopo na raiz
const PRECACHE_URLS = [
  '/',                            // shell
  '/index.html',

  // Páginas
  '/pages/help.html',
  '/pages/graficos.html',
  '/pages/relatorios.html',
  '/pages/transacoes.html',

  // CSS
  '/assets/css/style.css',

  // JS (ordem não importa para cache, mas deixo organizado)
  '/js/config.js',
  '/js/eventEmitter.js',
  '/js/storage.js',
  '/js/dom.js',
  '/js/finance.js',
  '/js/charts.js',
  '/js/app.js',

  // PWA / ícones
  '/manifest.json',
  '/favicon.png',
  '/assets/icons/web-app-manifest-192x192.png',
  '/assets/icons/web-app-manifest-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      PRECACHE_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) await cache.put(url, res.clone());
        } catch (_) { /* ignora falhas individuais */ }
      })
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

// Helpers de estratégia
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await caches.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => undefined);
  return cached || fetchPromise || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navegações (HTML) → network-first com fallback para shell
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await fetch(req);
        return fresh;
      } catch {
        return (await caches.match('/index.html')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Mesma origem: recursos estáticos → cache-first; demais → SWR
  if (url.origin === self.location.origin) {
    const dest = req.destination; // 'style' | 'script' | 'image' | 'font' | 'document' | ''
    if (['style', 'script', 'image', 'font'].includes(dest)) {
      event.respondWith(cacheFirst(req));
    } else {
      event.respondWith(staleWhileRevalidate(req));
    }
    return;
  }

  // CDNs → stale-while-revalidate
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// Atualização rápida do SW (opcional)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
