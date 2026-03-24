self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icon-192x192.png', // 앱 아이콘 경로 (필요시 추가)
            badge: '/badge-72x72.png', // 알림 배지 경로 (필요시 추가)
            data: {
                url: data.url || '/'
            },
            vibrate: [100, 50, 100]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
