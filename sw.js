// Service Worker para PWA Charlotte
const CACHE_NAME = 'charlotte-v1.0.0';
const STATIC_CACHE = 'charlotte-static-v1.0.0';

// Recursos críticos para cachear
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/admin.html',
  '/estudiante.html',
  '/login.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/components/header.html',
  '/components/footer.html'
];

// Recursos estáticos para cachear
const STATIC_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    Promise.all([
      // Cachear recursos críticos
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Service Worker: Cacheando recursos críticos...');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cachear recursos estáticos
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Cacheando recursos estáticos...');
        return cache.addAll(STATIC_RESOURCES);
      })
    ]).then(() => {
      console.log('Service Worker: Instalación completada');
      return self.skipWaiting();
    })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediatamente
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activación completada');
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo manejar requests GET
  if (event.request.method !== 'GET') return;

  // Estrategia de cache: Cache First para recursos estáticos, Network First para contenido dinámico
  if (STATIC_RESOURCES.some(resource => url.href.includes(resource)) ||
      CRITICAL_RESOURCES.some(resource => url.pathname === resource)) {
    // Cache First para recursos estáticos
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            // Cachear la respuesta para futuras requests
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                // Verificar que el request sea válido antes de cachear
                if (event.request.url && !event.request.url.startsWith('chrome-extension://')) {
                  // Crear un nuevo Request object para asegurar que sea cacheable
                  const requestToCache = new Request(event.request.url, {
                    method: event.request.method,
                    headers: event.request.headers
                  });
                  cache.put(requestToCache, responseClone).catch((error) => {
                    console.warn('Service Worker: Error cacheando recurso estático:', error);
                  });
                }
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Si falla, intentar servir página offline básica
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  } else {
    // Network First para contenido dinámico
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cachear respuestas exitosas de API
          if (response.status === 200 && url.hostname.includes('firestore.googleapis.com')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Verificar que el request sea válido antes de cachear
              if (event.request.url && !event.request.url.startsWith('chrome-extension://')) {
                // Crear un nuevo Request object para asegurar que sea cacheable
                const requestToCache = new Request(event.request.url, {
                  method: event.request.method,
                  headers: event.request.headers,
                  mode: 'cors',
                  credentials: 'same-origin'
                });
                cache.put(requestToCache, responseClone).catch((error) => {
                  console.warn('Service Worker: Error cacheando respuesta API:', error);
                });
              }
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar servir desde cache
          return caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }
            // Si no hay cache, servir página offline
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
        })
    );
  }
});

// Manejar Push Notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recibido', event);

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || 'Tienes una nueva notificación de Charlotte',
    icon: '/manifest.json', // Usaremos el icono del manifest
    badge: '/manifest.json',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/manifest.json'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/manifest.json'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Charlotte - Cursos',
      options
    )
  );
});

// Manejar clic en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notificación clickeada', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar si ya hay una ventana abierta con la URL
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensaje recibido', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background Sync (para futuras implementaciones)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implementar sincronización en background cuando sea necesario
  console.log('Service Worker: Ejecutando background sync');
}

// Periodic Background Sync (para futuras implementaciones)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync', event.tag);

  if (event.tag === 'periodic-sync') {
    event.waitUntil(doPeriodicSync());
  }
});

async function doPeriodicSync() {
  // Implementar sincronización periódica cuando sea necesario
  console.log('Service Worker: Ejecutando periodic sync');
}