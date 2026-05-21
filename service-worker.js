// Service Worker - Mis Horas Taller
// Maneja cache offline de la app y reintenta envios pendientes en background

const CACHE_NAME = 'mis-horas-v5';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Al instalarse: cachea los archivos de la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

// Al activarse: limpia caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Al pedir un recurso: intenta cache primero, sino la red
self.addEventListener('fetch', event => {
  // Solo manejar pedidos GET de nuestra misma origen
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});

// Background Sync: cuando vuelve la conexion, intenta vaciar la cola
self.addEventListener('sync', event => {
  if (event.tag === 'enviar-pendientes') {
    event.waitUntil(enviarPendientes());
  }
});

// Intentar enviar los pendientes desde IndexedDB
async function enviarPendientes() {
  try {
    // Notificar a todos los clientes (paginas abiertas) que reintenten
    const clientes = await self.clients.matchAll({ includeUncontrolled: true });
    for (const cliente of clientes) {
      cliente.postMessage({ tipo: 'reintentar-cola' });
    }
  } catch (err) {
    console.error('Error en background sync:', err);
  }
}
