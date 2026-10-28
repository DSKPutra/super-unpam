import { useEffect, useState } from 'react'
import { Apple, ArrowRight, Download, ExternalLink, Laptop, Monitor, Share, Smartphone, SquarePlus, X } from 'lucide-react'
import { detectPlatform, promptInstall, useInstall, type Platform } from '../lib/install'

// Tautan unduhan resmi. Desktop (.exe/.msi/.dmg) dibangun otomatis oleh GitHub Actions
// (.github/workflows/release-desktop.yml) dan dipublikasikan di GitHub Releases.
export const LINKS = {
  desktopRelease: 'https://github.com/DSKPutra/super-unpam/releases/latest',
  playStore: '', // TODO: isi setelah TWA rilis di Google Play
  appStore: '', // TODO: isi setelah rilis App Store
  msStore: '', // TODO: isi setelah rilis Microsoft Store (.msix)
}

const LABEL: Record<Platform, { title: string; Icon: typeof Smartphone }> = {
  android: { title: 'Install Aplikasi', Icon: Smartphone },
  ios: { title: 'Install di iPhone/iPad', Icon: Apple },
  windows: { title: 'Install untuk Windows', Icon: Monitor },
  mac: { title: 'Install untuk Mac', Icon: Laptop },
  other: { title: 'Install Aplikasi', Icon: Download },
}

export function DownloadCTA({ go, compact = false }: { go: (r: string) => void; compact?: boolean }) {
  const platform = detectPlatform()
  const { canPrompt, standalone } = useInstall()
  const [guide, setGuide] = useState<'ios' | 'mac' | null>(null)
  const [qr, setQr] = useState('')
  const isDesktop = platform === 'windows' || platform === 'mac' || platform === 'other'
  const { title, Icon } = LABEL[platform]

  useEffect(() => {
    if (!isDesktop || compact) return
    // QR dimuat on-demand hanya di desktop: pindai untuk membuka di HP
    import('qrcode').then((QR) => QR.toDataURL(location.origin, { margin: 1, width: 200, color: { dark: '#0B1222', light: '#ffffff' } }).then(setQr))
  }, [isDesktop, compact])

  if (standalone) {
    return (
      <div className="glass flex items-center gap-3 p-4 text-sm">
        <Download className="h-5 w-5 text-mint" /> Super UNPAM sudah terpasang di perangkat ini.
      </div>
    )
  }

  const primary = async () => {
    if (canPrompt) return void promptInstall()
    if (platform === 'ios') return setGuide('ios')
    if (platform === 'mac') return setGuide('mac')
    go('download')
  }

  return (
    <div className="glass relative overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,var(--primary),transparent)] opacity-30" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex-1">
          <h2 className="text-xl font-bold md:text-2xl">
            Pasang <span className="text-gradient">Super UNPAM</span>
          </h2>
          <p className="mt-1 text-sm text-mid">Buka lebih cepat, bisa offline, dan dapat notifikasi, langsung dari layar utama perangkatmu.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={primary} className="btn-primary flex min-h-12 items-center gap-2 rounded-2xl px-5 font-semibold">
              <Icon className="h-5 w-5" /> {title}
            </button>
            <button onClick={() => go('download')} className="flex min-h-12 items-center gap-1 rounded-2xl px-3 text-sm font-semibold text-cyan hover:underline">
              Semua platform <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {!compact && <StoreBadges />}
        </div>
        {qr && (
          <div className="flex items-center gap-3 md:flex-col md:text-center">
            <img src={qr} alt="QR untuk membuka Super UNPAM di HP" width={112} height={112} className="h-28 w-28 rounded-xl bg-white p-1.5" />
            <p className="max-w-36 text-xs text-mid">Pindai untuk memasang di HP</p>
          </div>
        )}
      </div>
      {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
    </div>
  )
}

export function StoreBadges() {
  const badges = [
    { label: 'Google Play', href: LINKS.playStore },
    { label: 'App Store', href: LINKS.appStore },
    { label: 'Microsoft Store', href: LINKS.msStore },
    { label: 'Unduh desktop (.exe/.dmg)', href: LINKS.desktopRelease },
  ]
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {badges.map((b) =>
        b.href ? (
          <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-glass-strong px-3 text-xs font-semibold hover:border-[var(--primary)]">
            {b.label} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span key={b.label} className="flex min-h-10 items-center rounded-xl border border-dashed border-line px-3 text-xs text-low">
            {b.label} · segera
          </span>
        ),
      )}
    </div>
  )
}

export function InstallGuide({ kind, onClose }: { kind: 'ios' | 'mac'; onClose: () => void }) {
  const steps =
    kind === 'ios'
      ? [
          { Icon: Share, text: 'Buka di Safari, lalu ketuk tombol Bagikan (kotak dengan panah ke atas).' },
          { Icon: SquarePlus, text: 'Gulir dan pilih "Tambahkan ke Layar Utama".' },
          { Icon: Smartphone, text: 'Ketuk "Tambah". Super UNPAM muncul di layar utama seperti aplikasi biasa.' },
        ]
      : [
          { Icon: Laptop, text: 'Safari (macOS Sonoma+): menu File → "Add to Dock".' },
          { Icon: Monitor, text: 'Chrome/Edge: klik ikon Install di ujung kanan address bar.' },
          { Icon: Download, text: 'Atau unduh installer .dmg dari halaman Download.' },
        ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-label="Panduan install" onClick={onClose}>
      <div className="glass page-enter w-full max-w-sm !rounded-[28px] !bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{kind === 'ios' ? 'Install di iPhone/iPad' : 'Install di Mac'}</h3>
          <button onClick={onClose} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-glass-strong">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                <s.Icon className="h-4 w-4" />
              </span>
              <span className="pt-1.5 text-sm">{s.text}</span>
            </li>
          ))}
        </ol>
        {kind === 'ios' && <p className="mt-4 text-xs text-mid">Notifikasi push di iPhone butuh iOS 16.4+ dan aplikasi sudah terpasang di layar utama.</p>}
      </div>
    </div>
  )
}
