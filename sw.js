const CACHE_NAME = 'fina-calc-v21';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/data/constants.js',
    '/js/data/standards.js',
    '/js/data/world_records.js',
    '/js/helpers/utils.js',
    '/js/helpers/analytics.js',
    '/js/core/Calculator.js',
    '/js/core/Storage.js',
    '/js/ui/Share.js',
    '/js/ui/PWAInstall.js',
    '/js/ui/Onboarding.js',
    '/js/ui/NativeChrome.js',
    '/manifest.json',
    '/robots.txt',
    '/assets/img/favicon.png',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/assets/img/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
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
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Чужие origin (Метрика, шрифты) не кэшируем — пусть идут в сеть напрямую
    if (url.origin !== self.location.origin) return;

    // Stale-while-revalidate: кэш отдаём сразу, свежее тянем в фоне и кладём в кэш.
    // Офлайн продолжает работать, а обновление доезжает со следующей загрузки —
    // без этого можно было получить новый index.html со старым style.css.
    event.respondWith(
        // ignoreSearch: приход с рекламной меткой (?utm_*) должен попадать в тот же
        // кэш, что и чистый адрес, — иначе офлайн по такой ссылке не работает
        caches.open(CACHE_NAME).then((cache) => cache.match(request, { ignoreSearch: true }).then((cached) => {
            // cache: 'no-cache' — условный запрос к серверу мимо HTTP-кэша браузера.
            // Без этого ревалидация возвращала бы те же старые байты из кэша браузера
            // и Cache Storage никогда бы не обновлялся.
            const network = fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
                .then((response) => {
                    // Навигацию нельзя удовлетворить перенаправленным ответом — браузер
                    // бросит TypeError, и страница просто не откроется. Так ломался
                    // переход на /qr: сервер отдаёт 308 на /qr/, fetch по умолчанию идёт
                    // по редиректу, и сюда приходит response.redirected = true.
                    // Отдаём сам редирект — по нему браузер сходит сам.
                    if (request.mode === 'navigate' && response.redirected) {
                        return Response.redirect(response.url, 301);
                    }

                    // Адреса с меткой в кэш не кладём, иначе он растёт на каждую метку
                    if (response && response.status === 200 && response.type === 'basic' && !url.search) {
                        cache.put(request, response.clone());
                    }
                    return response;
                })
                .catch((err) => {
                    if (cached) return cached;
                    throw err;
                });

            if (cached) {
                event.waitUntil(network);
                return cached;
            }

            return network;
        }))
    );
});
