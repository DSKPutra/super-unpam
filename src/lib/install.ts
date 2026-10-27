import { useSyncExternalStore } from 'react'

// Satu penampung event `beforeinstallprompt` untuk seluruh aplikasi (banner + tombol Download).
// Didaftarkan saat modul dimuat agar event yang terpicu sebelum React render tidak hilang.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

export const isStandalone = () =>
  installed ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export async function promptInstall() {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  emit()
  return outcome === 'accepted'
}

export function dismissInstall() {
  deferred = null
  emit()
}

export function useInstall() {
  const canPrompt = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => deferred !== null,
  )
  return { canPrompt, standalone: isStandalone() }
}

export type Platform = 'android' | 'ios' | 'windows' | 'mac' | 'other'

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  // iPadOS 13+ melapor sebagai Macintosh dengan layar sentuh
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/windows/i.test(ua)) return 'windows'
  if (/macintosh|mac os x/i.test(ua)) return 'mac'
  return 'other'
}
