// Geanna's Planner — Service Worker
// Caches the app for offline use + handles scheduled notifications

const CACHE_NAME = 'geanna-planner-v37';
const ASSETS_TO_CACHE = [
    './geanna-planner-sync.html',
    './manifest.json',
    './icon.svg'
];

// On install: cache all app assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// On activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// On fetch: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                if (event.request.headers.get('accept') &&
                    event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./geanna-planner-sync.html');
                }
            });
        })
    );
});

// Handle notification clicks — open/focus the app
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('geanna-planner') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./geanna-planner-sync.html');
            }
        })
    );
});

// Receive messages from the app to show notifications
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = event.data;
        self.registration.showNotification(title, {
            body,
            tag: tag || 'geanna-planner',
            icon: './icon.svg',
            badge: './icon.svg',
            vibrate: [200, 100, 200]
        });
    }
});
