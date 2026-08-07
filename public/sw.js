const STATIC_CACHE = 'drawing-dms-static-v1';

const STATIC_FILES = [
    '/manifest.webmanifest',
    '/pwa/icon-192.png',
    '/pwa/icon-512.png',
    '/pwa/icon-maskable-512.png',
    '/pwa/apple-touch-icon.png',
];

/**
 * Cache only public PWA metadata and icons.
 *
 * Do not cache:
 * - Laravel pages
 * - Inertia responses
 * - Drawings
 * - Revision files
 * - Site photos
 * - APS tokens
 * - Authentication responses
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) =>
                cache.addAll(STATIC_FILES),
            ),
    );

    self.skipWaiting();
});

/**
 * Remove previous static-cache versions whenever
 * the service worker version changes.
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter(
                            (cacheName) =>
                                cacheName !==
                                STATIC_CACHE,
                        )
                        .map((cacheName) =>
                            caches.delete(
                                cacheName,
                            ),
                        ),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

/**
 * Use cache-first only for PWA icons and manifest.
 *
 * Every application page and private resource continues
 * going directly to Laravel and APS.
 */
self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (
        request.method !== 'GET' ||
        request.url.startsWith(
            'chrome-extension://',
        )
    ) {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const isPwaAsset =
        url.pathname ===
            '/manifest.webmanifest' ||
        url.pathname.startsWith('/pwa/');

    if (!isPwaAsset) {
        return;
    }

    event.respondWith(
        caches
            .match(request)
            .then(
                (cachedResponse) =>
                    cachedResponse ??
                    fetch(request).then(
                        (networkResponse) => {
                            if (
                                !networkResponse.ok
                            ) {
                                return networkResponse;
                            }

                            const responseCopy =
                                networkResponse.clone();

                            caches
                                .open(
                                    STATIC_CACHE,
                                )
                                .then((cache) =>
                                    cache.put(
                                        request,
                                        responseCopy,
                                    ),
                                );

                            return networkResponse;
                        },
                    ),
            ),
    );
});