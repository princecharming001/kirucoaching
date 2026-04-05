/* Elevated Potential Coaching — Web Push (Safari / iOS 16.4+ & desktop browsers) */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  var title = data.title || 'Elevated Potential Coaching';
  var options = {
    body: data.body || 'Reminder',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    tag: data.tag || 'kiru-reminder',
    renotify: !!data.renotify,
    data: data.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length) {
        clientList[0].focus();
        return;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
