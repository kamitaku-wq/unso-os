// Service Worker: Web Push通知 + オフラインキューイング

// === Push通知 ===
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: '通知', body: '' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/todo') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/todo')
    })
  )
})

// === オフラインキューイング ===
// POST/PATCH/DELETE リクエストが失敗した場合に IndexedDB に保存し、復帰時に再送する

const QUEUE_DB = 'offline-queue'
const QUEUE_STORE = 'requests'
const API_PATHS = ['/api/cleaning-job', '/api/attendance', '/api/expense']

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function enqueue(url, method, headers, body) {
  const db = await openDB()
  const tx = db.transaction(QUEUE_STORE, 'readwrite')
  tx.objectStore(QUEUE_STORE).add({ url, method, headers, body, timestamp: Date.now() })
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject })
}

async function drainQueue() {
  const db = await openDB()
  const tx = db.transaction(QUEUE_STORE, 'readonly')
  const store = tx.objectStore(QUEUE_STORE)
  const items = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  for (const item of items) {
    try {
      const res = await fetch(item.url, { method: item.method, headers: item.headers, body: item.body })
      if (res.ok || res.status < 500) {
        const delTx = db.transaction(QUEUE_STORE, 'readwrite')
        delTx.objectStore(QUEUE_STORE).delete(item.id)
        await new Promise((resolve) => { delTx.oncomplete = resolve })
      }
    } catch {
      break
    }
  }
}

// API への書き込みリクエストをインターセプト
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const method = event.request.method

  if (method === 'GET' || !API_PATHS.some((p) => url.pathname.startsWith(p))) return

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(event.request.clone())
        return res
      } catch {
        const body = await event.request.text()
        const headers = {}
        event.request.headers.forEach((v, k) => { headers[k] = v })
        await enqueue(event.request.url, method, headers, body)

        // オフライン時の仮レスポンスを返す
        return new Response(JSON.stringify({ queued: true, message: 'オフラインのため保存しました。復帰時に自動送信します。' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })()
  )
})

// オンライン復帰時にキューを再送
self.addEventListener('message', (event) => {
  if (event.data === 'drain-queue') {
    event.waitUntil(drainQueue())
  }
})
