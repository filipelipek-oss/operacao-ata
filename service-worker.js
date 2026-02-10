const CACHE_NAME = 'operacao-ata-v5';
const OFFLINE_URL = './index.html';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo-entalpia.png',
  './assets/banner.png',
  './assets/watermark.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap'
];

// Instalar e cachear recursos essenciais
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando versão:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando recursos');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[Service Worker] Erro no cache:', err))
  );
});

// Ativar e limpar caches antigos
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando versão:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de fetch
self.addEventListener('fetch', event => {
  // Ignorar requisições não-HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Para fontes do Google: Network First
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Para navegação: Network First com fallback para cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Para o resto: Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          // Só cachear respostas same-origin ou cors
          if (response.type === 'basic' || response.type === 'cors') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // Fallback final
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Sincronização em background
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync:', event.tag);
  if (event.tag === 'sync-study-data') {
    event.waitUntil(syncStudyData());
  }
});

async function syncStudyData() {
  console.log('[Service Worker] Sincronizando dados de estudo...');
}

// Notificações push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Hora de estudar!',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'study-reminder',
    requireInteraction: false
  };
  event.waitUntil(
    self.registration.showNotification('Operação ATA', options)
  );
});
