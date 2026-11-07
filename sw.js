const CACHE_NAME = 'costera-cache-v1';
const STATIC_ASSETS = [
'./',
'./index.html',
'./manifest.webmanifest',
'./costera-logo.svg',
'./icono-192.png',
'./icono-512.png',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
);
self.skipWaiting();
});

self.addEventListener('activate', (event) => {
event.waitUntil(
caches.keys().then((keys) =>
Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
)
);
self.clients.claim();
});

self.addEventListener('fetch', (event) => {
// Estrategia Network First para órdenes y datos dinámicos, Cache First para estáticos/mapas
if (event.request.url.includes('tile.openstreetmap.org') || event.request.url.includes('arcgisonline.com')) {
event.respondWith(
caches.open('costera-map-tiles').then(async (cache) => {
const cached = await cache.match(event.request);
if (cached) return cached;
try {
const networkResponse = await fetch(event.request);
if (networkResponse.ok) cache.put(event.request, networkResponse.clone());
return networkResponse;
} catch {
return new Response('', { status: 408 });
}
})
);
return;
}

event.respondWith(
caches.match(event.request).then((cachedResponse) => {
return (
cachedResponse ||
fetch(event.request).catch(() => {
if (event.request.mode === 'navigate') {
return caches.match('./index.html');
}
})
);
})
);
});

// Sincronización en segundo plano (Background Sync) para pedidos e incidentes sin señal
self.addEventListener('sync', (event) => {
if (event.tag === 'sync-offline-deliveries') {
event.waitUntil(syncOfflineEvents());
}
});

async function syncOfflineEvents() {
// Notifica a los clientes abiertos que hay conexión para sincronizar IndexedDB
const clients = await self.clients.matchAll();
clients.forEach(client => client.postMessage({ type: 'SYNC_OFFLINE_DATA' }));
}