const CACHE_NAME = 'fina-calc-v24';

// Всё, что нужно приложению офлайн. Список заодно служит белым списком для
// runtime-кэша (см. isCacheable) — иначе кэш растёт бесконтрольно.
const ASSETS_TO_CACHE = [
    '/',
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
    '/assets/fonts/inter-latin.woff2',
    '/assets/fonts/inter-cyrillic.woff2',
    '/assets/fonts/jetbrains-mono-latin.woff2',
    '/assets/fonts/jetbrains-mono-cyrillic.woff2',
    '/assets/img/favicon.png',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/assets/img/icon-maskable-512.png',
    '/assets/img/apple-touch-icon.png',
    '/qr/',
    '/js/lib/qrcode.min.js'
];

const PRECACHED = new Set(ASSETS_TO_CACHE);

// В кэш кладём только известные пути. Причина конкретная: сервер на любой
// неизвестный адрес отдаёт index.html со статусом 200, и без этой проверки
// каждый мусорный URL оседал бы в кэше отдельной копией страницы.
function isCacheable(url) {
    return PRECACHED.has(url.pathname);
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => (
            // По одному, а не cache.addAll: addAll атомарен, и один недостающий
            // файл ронял установку целиком — приложение оставалось вообще без
            // офлайна. Пусть лучше не доедет один ресурс, чем все.
            Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url)))
        ))
        // skipWaiting здесь НЕ вызываем: иначе новый SW захватывает управление
        // сам, страница перезагружается по controllerchange — возможно, посреди
        // ввода времени. Решение оставлено пользователю: кнопка в тосте шлёт
        // SKIP_WAITING (см. ниже).
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Ускоряет первую навигацию после активации: браузер начинает
            // запрос параллельно со стартом воркера
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable().catch(() => { });
            }
            const names = await caches.keys();
            await Promise.all(names.map((n) => (n === CACHE_NAME ? null : caches.delete(n))));
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Чужие origin (Метрика) не кэшируем — пусть идут в сеть напрямую.
    // Шрифты теперь свои, так что офлайн от этого больше не страдает.
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
            const network = Promise.resolve(event.preloadResponse)
                .then((preloaded) => preloaded || fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }))
                .then((response) => {
                    // Навигацию нельзя удовлетворить перенаправленным ответом — браузер
                    // бросит TypeError, и страница просто не откроется. Так ломался
                    // переход на /qr: сервер отдаёт 308 на /qr/, fetch по умолчанию идёт
                    // по редиректу, и сюда приходит response.redirected = true.
                    // Отдаём сам редирект — по нему браузер сходит сам.
                    if (request.mode === 'navigate' && response.redirected) {
                        return Response.redirect(response.url, 301);
                    }

                    if (response && response.status === 200 && response.type === 'basic' && !url.search && isCacheable(url)) {
                        cache.put(request, response.clone());
                    }
                    return response;
                })
                .catch(async (err) => {
                    if (cached) return cached;
                    // Офлайн на непосещённом адресе. Раньше здесь был throw, и
                    // пользователь видел страницу ошибки браузера — при том что всё
                    // приложение лежало в кэше. Отдаём его: оно самодостаточно,
                    // отдельная offline.html не нужна.
                    if (request.mode === 'navigate') {
                        const shell = await cache.match('/');
                        if (shell) return shell;
                    }
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
