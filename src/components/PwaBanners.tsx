import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { Dict } from '../lib/i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export function PwaBanners({ t }: { t: Dict }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    if (isIos() && !isStandalone()) setShowIos(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pointer-events-none">
      {!online && (
        <div className="pointer-events-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow">{t.offline}</div>
      )}
      {needRefresh && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {t.updateAvail}
          <button className="rounded-lg bg-unpam-500 px-3 py-1 font-semibold" onClick={() => updateServiceWorker(true)}>
            {t.reload}
          </button>
          <button aria-label="Tutup" onClick={() => setNeedRefresh(false)}>✕</button>
        </div>
      )}
      {installEvt && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-unpam-600 px-4 py-2 text-sm text-white shadow-lg">
          📲 Super UNPAM
          <button
            className="rounded-lg bg-white px-3 py-1 font-semibold text-unpam-700"
            onClick={async () => {
              await installEvt.prompt()
              setInstallEvt(null)
            }}
          >
            {t.install}
          </button>
          <button aria-label="Tutup" onClick={() => setInstallEvt(null)}>✕</button>
        </div>
      )}
      {showIos && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl bg-unpam-600 px-4 py-2 text-sm text-white shadow-lg">
          <span>📲 {t.installIos}</span>
          <button aria-label="Tutup" onClick={() => setShowIos(false)}>✕</button>
        </div>
      )}
    </div>
  )
}
