'use client'

// Web Push通知の許可リクエストとService Worker登録
// app/layout.tsx に組み込む
import { useEffect } from 'react'

// Base64をArrayBufferに変換（VAPID公開鍵の変換に必要）
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}

export function PushSetup() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const vapidKey: string | undefined = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const validVapidKey: string = vapidKey

    async function setup() {
      try {
        // Service Worker を登録
        const registration = await navigator.serviceWorker.register('/sw.js')

        // 通知許可をリクエスト（すでに決定済みなら即座に返る）
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Push購読
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(validVapidKey),
        })

        // サーバーに購読情報を保存
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        })
      } catch {
        // 通知許可拒否時はサイレントに終了（ベルアイコンのみにフォールバック）
      }
    }

    void setup()
  }, [])

  return null
}
