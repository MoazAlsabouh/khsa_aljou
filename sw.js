const CACHE_NAME = 'khsa-aljou-v1';
const STATIC_ASSETS = [
  '/khsa_aljou/',
  '/khsa_aljou/index.html',
  '/khsa_aljou/manifest.json',
  '/khsa_aljou/logo.png',
  '/khsa_aljou/pwa-192x192.png',
  '/khsa_aljou/pwa-512x512.png',
  '/khsa_aljou/apple-touch-icon.png'
];

// تثبيت الـ Service Worker وحفظ الأصول الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets could not be precached:', err);
      });
    })
  );
  self.skipWaiting();
});

// تفعيل وتطهير الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// اعتراض الطلبات وتقديم تجربة فائقة السرعة مع دعم عدم الاتصال
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // استثناء طلبات الـ WebSocket أو طلبات غير GET
  if (request.method !== 'GET' || url.protocol.startsWith('ws')) {
    return;
  }

  // 1. طلبات الـ API: Network-first مع Fallback للـ Cache
  if (url.pathname.includes('/api/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({
                offline: true,
                message: 'أنت غير متصل بالإنترنت حالياً. يتم عرض البيانات المحفوظة مسبقاً.'
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 2. طلبات الصور والملفات الثابتة: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // في حال كان الطلب صفحة HTML وغير متصل، نُعيد index.html الرئيسي
        if (request.mode === 'navigate') {
          return caches.match('/khsa_aljou/index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// استقبال الإشعارات الفورية اللحظية (Push Notifications)
self.addEventListener('push', (event) => {
  let data = { title: 'خسى الجوع', body: 'تحديث جديد بشأن طلبك!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/khsa_aljou/pwa-192x192.png',
    badge: '/khsa_aljou/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/khsa_aljou/orders'
    },
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/khsa_aljou/';
      for (const client of clientList) {
        if (client.url.includes('/khsa_aljou/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
