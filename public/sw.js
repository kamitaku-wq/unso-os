// Service Worker: Web Push通知の受信と表示
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: '通知', body: '' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
    })
  )
})

// 通知クリックで /todo に遷移
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // すでに開いているウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes('/todo') && 'focus' in client) {
          return client.focus()
        }
      }
      // なければ新しいタブで開く
      return clients.openWindow('/todo')
    })
  )
})
