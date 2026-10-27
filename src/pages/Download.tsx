import { useState } from 'react'
import { Apple, Globe, Laptop, Monitor, Smartphone } from 'lucide-react'
import { detectPlatform, type Platform } from '../lib/install'
import { DownloadCTA, InstallGuide, LINKS } from '../components/DownloadCTA'
import { Badge, PageHeader, Section } from '../components/ui'

const PLATFORMS: { id: Platform; name: string; Icon: typeof Smartphone; steps: string[]; links: { label: string; href: string }[] }[] = [
  {
    id: 'android',
    name: 'Android',
    Icon: Smartphone,
    steps: ['Buka situs ini di Chrome/Edge.', 'Ketuk "Install Aplikasi" (atau menu ⋮ → Install app).', 'Versi Google Play (TWA) menyusul.'],
    links: [{ label: 'Google Play', href: LINKS.playStore }],
  },
  {
    id: 'ios',
    name: 'iPhone & iPad',
    Icon: Apple,
    steps: ['Buka situs ini di Safari.', 'Ketuk Bagikan → "Tambahkan ke Layar Utama".', 'Push notifikasi butuh iOS 16.4+.'],
    links: [{ label: 'App Store', href: LINKS.appStore }],
  },
  {
    id: 'windows',
    name: 'Windows',
    Icon: Monitor,
    steps: ['Edge/Chrome: klik ikon Install di address bar.', 'Atau unduh installer .exe/.msi (Tauri, ringan).'],
    links: [
      { label: 'Installer .exe / .msi', href: LINKS.desktopRelease },
      { label: 'Microsoft Store', href: LINKS.msStore },
    ],
  },
  {
    id: 'mac',
    name: 'macOS',
    Icon: Laptop,
    steps: ['Safari (Sonoma+): File → "Add to Dock".', 'Chrome/Edge: klik ikon Install di address bar.', 'Atau unduh installer .dmg (Tauri).'],
    links: [{ label: 'Installer .dmg', href: LINKS.desktopRelease }],
  },
  {
    id: 'other',
    name: 'Web',
    Icon: Globe,
    steps: ['Cukup buka alamat situs ini di browser apa pun, tanpa install.'],
    links: [],
  },
]

export function DownloadPage({ go, back }: { go: (r: string) => void; back: () => void }) {
  const current = detectPlatform()
  const [guide, setGuide] = useState<'ios' | 'mac' | null>(null)
  return (
    <div>
      <PageHeader title="Download" subtitle="Satu aplikasi untuk web, Android, iOS, Windows & macOS" onBack={back} />
      <DownloadCTA go={go} />
      <Section title="Pilih platform">
        <div className="grid gap-3 md:grid-cols-2">
          {PLATFORMS.map((p) => (
            <article key={p.id} className={`glass p-5 ${p.id === current ? 'ring-2 ring-[var(--primary)]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-glass-strong">
                  <p.Icon className="h-5 w-5 text-cyan" />
                </span>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.id === current && <Badge tone="blue">Perangkatmu</Badge>}
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-mid">
                {p.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                {(p.id === 'ios' || p.id === 'mac') && (
                  <button onClick={() => setGuide(p.id as 'ios' | 'mac')} className="btn-primary min-h-10 rounded-xl px-3 text-xs font-semibold">
                    Lihat panduan
                  </button>
                )}
                {p.links.map((l) =>
                  l.href ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center rounded-xl border border-line bg-glass-strong px-3 text-xs font-semibold">
                      {l.label}
                    </a>
                  ) : (
                    <span key={l.label} className="flex min-h-10 items-center rounded-xl border border-dashed border-line px-3 text-xs text-low">
                      {l.label} · segera
                    </span>
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      </Section>
      {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
    </div>
  )
}
