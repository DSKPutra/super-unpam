import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import type { Dict } from '../lib/i18n'

// Banner global: versi baru tersedia & status offline.
// Ajakan install ada di <DownloadCTA /> (Beranda) dan halaman /download.
export function PwaBanners({ t }: { t: Dict }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3" role="status">
      {!online && (
        <div className="glass pointer-events-auto flex items-center gap-2 !rounded-2xl !bg-surface px-4 py-2.5 text-sm font-semibold text-amber">
          <WifiOff className="h-4 w-4" /> {t.offline}
        </div>
      )}
      {needRefresh && (
        <div className="glass pointer-events-auto flex items-center gap-3 !rounded-2xl !bg-surface px-4 py-2 text-sm">
          <RefreshCw className="h-4 w-4 text-cyan" /> {t.updateAvail}
          <button className="btn-primary min-h-9 rounded-xl px-3 font-semibold" onClick={() => updateServiceWorker(true)}>
            {t.reload}
          </button>
          <button aria-label="Tutup" className="flex h-9 w-9 items-center justify-center" onClick={() => setNeedRefresh(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
