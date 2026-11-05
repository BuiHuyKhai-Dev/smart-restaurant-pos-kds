const CACHE_NAME = 'smart-restaurant-cache-v3';
const APP_SHELL = ['/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Không cache API, Socket.io hoặc Next.js development/hot-reloads
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return;
  }

  // Network-First: Luôn tải mã mới nhất từ máy chủ khi đang kết nối mạng
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Chỉ lưu cache khi phản hồi hợp lệ
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.webmanifest'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Nếu mất mạng hoàn toàn thì mới đọc từ cache
        return caches.match(event.request);
      })
  );
});
