// Service Worker for Browser Push Notifications

self.addEventListener('push', (event) => {
  let data = { title: 'New Notification', body: '' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'New Notification', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: data.metadata || {},
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    }),
  );
});
