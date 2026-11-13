// ===================== SERVICE WORKER — Piano Tools =====================
// Mude este número a cada atualização do app para forçar o refresh do cache.
const CACHE_NAME = 'piano-tools-v4';

// Caminhos RELATIVOS: funcionam em qualquer subpasta (ex: usuario.github.io/piano-tools/)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/components.css',
  './css/tools.css',
  './js/data.js',
  './js/audio.js',
  './js/piano.js',
  './js/nav.js',
  './js/init.js',
  './js/tools/scales.js',
  './js/tools/metronome.js',
  './js/tools/staff.js',
  './js/tools/diary.js',
  './js/tools/chord.js',
  './js/tools/progressions.js',
  './js/tools/harmony.js',
  './js/tools/cifra.js',
  './js/tools/ear.js',
  './js/tools/listener.js',
  './js/tools/scores.js',
  './css/scores.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(LOCAL_ASSETS);
      // Fonte é opcional: se falhar, não impede a instalação do app
      try { await cache.add(FONT_CSS); } catch (e) {}
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Arquivos do app: REDE PRIMEIRO (sempre a versão nova quando online),
    // cache só como reserva offline.
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(hit => hit || caches.match('./index.html'))
        )
    );
  } else {
    // Fontes externas: cache primeiro
    event.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
      )
    );
  }
});
