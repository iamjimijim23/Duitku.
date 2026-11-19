// ══════════════════════════════════════════════
// DuitKu v37 — Service Worker (PWA)
// ══════════════════════════════════════════════

const CACHE_NAME    = 'duitku-v37-1-cache';
const CACHE_VERSION = 'v37.1';

const APP_SHELL = ['./', './index.html', './manifest.json'];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
];

self.addEventListener('install', event => {
  console.log('[SW DuitKu] Installing ' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(APP_SHELL).then(() =>
        cache.addAll(CDN_ASSETS).catch(err =>
          console.warn('[SW DuitKu] CDN cache sebagian gagal (normal):', err.message)
        )
      )
    ).then(() => { console.log('[SW DuitKu] Install selesai'); return self.skipWaiting(); })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW DuitKu] Activating...');
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => {
        console.log('[SW DuitKu] Hapus cache lama:', n);
        return caches.delete(n);
      })
    )).then(() => { console.log('[SW DuitKu] Aktif'); return self.clients.claim(); })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname === 'api.telegram.org') return;
  if (url.protocol === 'chrome-extension:') return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res && res.status === 200 && res.type !== 'opaque')
          cache.put(event.request, res.clone()).catch(() => {});
        return res;
      } catch (err) {
        if (event.request.destination === 'document' || event.request.mode === 'navigate') {
          const fb = await cache.match('./index.html') || await cache.match('./');
          if (fb) return fb;
        }
        return new Response(
          JSON.stringify({ error: 'Offline — tidak ada koneksi' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE')
    caches.delete(CACHE_NAME).then(() => event.ports[0] && event.ports[0].postMessage({ success: true }));
});
