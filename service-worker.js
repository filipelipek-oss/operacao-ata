const CACHE_NAME = 'operacao-ata-v5';
const ASSETS_TO_CACHE = [
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

// ===== INSTALAÇÃO =====
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cacheando arquivos...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalado com sucesso!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erro na instalação:', error);
      })
  );
});

// ===== ATIVAÇÃO =====
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Ativado!');
        return self.clients.claim();
      })
  );
});

// ===== FETCH (ESTRATÉGIA: CACHE FIRST, NETWORK FALLBACK) =====
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-HTTP (chrome-extension://, etc)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Retorna do cache e atualiza em background
          console.log('📦 Cache hit:', event.request.url);
          
          // Atualiza o cache em background (stale-while-revalidate)
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Silenciosamente falha se offline
            });
          
          return cachedResponse;
        }

        // Se não está no cache, busca da rede
        console.log('🌐 Network fetch:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Só cacheia respostas bem-sucedidas
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // Clona a resposta porque ela só pode ser consumida uma vez
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('❌ Fetch falhou:', error);
            
            // Retorna página offline personalizada (opcional)
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
      })
  );
});

// ===== SINCRONIZAÇÃO EM BACKGROUND (OPCIONAL) =====
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Aqui você pode implementar lógica de sincronização
  console.log('📤 Sincronizando dados...');
  // Exemplo: enviar dados salvos localmente para o servidor
}

// ===== NOTIFICAÇÕES PUSH (OPCIONAL) =====
self.addEventListener('push', (event) => {
  console.log('🔔 Push recebido:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização disponível!',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('OPERAÇÃO ATA', options)
  );
});

// ===== CLIQUE NA NOTIFICAÇÃO =====
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notificação clicada:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});