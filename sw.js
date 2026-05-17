// Service Worker para PWA Charlotte
const CACHE_NAME = 'charlotte-v1.2.4';
const STATIC_CACHE = 'charlotte-static-v1.2.4';

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

  // NUNCA interceptar peticiones de Firebase, Google APIs ni autenticación
  // Esto evita que el SW bloquee el login en móvil
  const excludedDomains = [
    'googleapis.com',
    'google.com',
    'gstatic.com',
    'firebaseio.com',
    'firebaseapp.com',
    'firebase.google.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firestore.googleapis.com',
    'cloudfunctions.net'
  ];

  if (excludedDomains.some(domain => url.hostname.includes(domain) || url.hostname.endsWith(domain))) {
    return; // Dejar que el navegador maneje estas peticiones directamente
  }

  // No interceptar requests cross-origin que no sean recursos estáticos conocidos
  // (imágenes externas, noticias, APIs de terceros, etc.)
  if (url.origin !== self.location.origin &&
      !STATIC_RESOURCES.some(resource => url.href.startsWith(resource))) {
    return;
  }

  // Para archivos HTML, CSS, JS - Network First (siempre validar con servidor)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') ||
      CRITICAL_RESOURCES.some(resource => url.pathname === resource)) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-cache' // Forzar validación con servidor
      })
        .then((response) => {
          // Solo cachear si la respuesta es exitosa
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, servir desde cache
          return caches.match(event.request);
        })
    );
  }
  // Para otros recursos - Cache First pero con validación
  else if (STATIC_RESOURCES.some(resource => url.href.includes(resource))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Verificar si el cache está fresco (menos de 1 hora)
            const cacheTime = new Date(response.headers.get('sw-cache-time') || 0);
            const now = new Date();
            const cacheAge = now - cacheTime;

            if (cacheAge < 60 * 60 * 1000) { // 1 hora
              return response;
            }
          }

          // Si no hay cache o está viejo, fetch y cachear
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              // Agregar timestamp al header
              const responseWithTime = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                  ...Object.fromEntries(responseClone.headers),
                  'sw-cache-time': new Date().toISOString()
                }
              });

              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseWithTime);
              });
            }
            return response;
          });
        })
    );
  }
  // Para APIs y contenido dinámico - Network First
  else {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cachear solo respuestas exitosas de nuestra propia API
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            }).catch(() => {});
          }
          return response;
        })
        .catch((error) => {
          console.warn('Network request failed for URL:', event.request.url);

          // Si falla la red, intentar servir desde cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Si no hay cache, devolver una respuesta de error controlada
            return new Response(JSON.stringify({
              error: 'Offline',
              message: 'No hay conexión a internet y no hay datos cacheados'
            }), {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            });
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
  // Solo loguear mensajes importantes, no los ruidosos de Firebase
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'GET_VERSION' || event.data.type === 'background-sync')) {
    console.log('Service Worker: Mensaje recibido', event.data);
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background Sync (para futuras implementaciones)
self.addEventListener('sync', (event) => {
  // console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implementar sincronización en background cuando sea necesario
  // console.log('Service Worker: Ejecutando background sync');
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