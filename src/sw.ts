/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  const data: PushPayload = event.data?.json() ?? {};
  const { title = 'Défis', body = '', url = '/', tag } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c) as WindowClient | undefined;
      return client ? client.focus() : self.clients.openWindow(url);
    })
  );
});
