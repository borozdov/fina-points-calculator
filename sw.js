const CACHE_NAME = 'fina-calc-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/lib/qrcode.min.js',
    '/js/data/constants.js',
    '/js/data/standards.js',
    '/js/data/world_records.js',
    '/js/helpers/utils.js',
    '/js/core/Calculator.js',
    '/js/core/Storage.js',
    '/js/ui/Share.js',
    '/js/ui/PWAInstall.js',
    '/js/ui/Onboarding.js',
    '/data/swimming_standards.json',
    '/manifest.json',
    '/robots.txt',
    '/assets/img/favicon.png',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/assets/img/apple-touch-icon.png',
    '/qr/',
    '/qr/index.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    // Verify valid response
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }

                    // Clone response and add to cache
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return fetchResponse;
                });
            })
    );
});
