import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Building2, GraduationCap, LayoutGrid, MapPin, Phone, Share2 } from 'lucide-react'
import { FAKULTAS, KONTAK, LAYANAN, LOKASI, MOTO } from '../data/kampus'
import type { Dict } from '../lib/i18n'

// #50 + U06 Onboarding: mengenalkan KAMPUS (bukan hanya aplikasi). Maksimal 5 layar, bisa dilewati
// (tombol atau Esc), dan bisa dibuka ulang dari Profil > Kenali Kampus. Data dari src/data/kampus.ts.

export function Onboarding({ t, onDone }: { t: Dict; onDone: () => void }) {
  const steps: { Icon: typeof MapPin; title: string; body: ReactNode }[] = [
    { Icon: Building2, title: t.obWelcomeTitle, body: <><p className="font-display text-base font-semibold text-cyan">“{MOTO.teks}”</p><p className="mt-2">{t.obWelcomeText}</p></> },
    {
      Icon: MapPin,
      title: t.obLokasiTitle,
      body: (
        <ul className="space-y-1.5">
          {LOKASI.map((l) => (
            <li key={l.id}><strong className="text-hi">{l.nama}</strong><br /><span className="text-xs">{l.alamat}</span></li>
          ))}
        </ul>
      ),
    },
    {
      Icon: GraduationCap,
      title: t.obFakultasTitle,
      body: <><p className="flex flex-wrap gap-1.5">{FAKULTAS.map((f) => <span key={f.id} className="rounded-full bg-glass-strong px-2.5 py-1 text-xs font-semibold text-hi">{f.nama}</span>)}</p><p className="mt-3">{t.obFakultasText}</p></>,
    },
    { Icon: LayoutGrid, title: t.obLayananTitle, body: <><p>{t.obLayananText}</p><p className="mt-2 text-xs">{LAYANAN.slice(0, 5).map((l) => l.nama).join(' · ')}</p></> },
    {
      Icon: Phone,
      title: t.obKontakTitle,
      body: (
        <ul className="space-y-1">
          {KONTAK.map((k) => (
            <li key={k.id}>{k.label}: <a href={k.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan underline">{k.nilai}</a></li>
          ))}
        </ul>
      ),
    },
  ]
  const [i, setI] = useState(0)
  const s = steps[i]
  const last = i === steps.length - 1
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => heading.current?.focus(), [i])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div key={i} className="glass page-enter max-h-[90vh] w-full max-w-sm overflow-y-auto !rounded-[28px] !bg-surface p-6">
        <span className="btn-primary flex h-14 w-14 items-center justify-center rounded-2xl" aria-hidden>
          <s.Icon className="h-7 w-7" />
        </span>
        <p className="mt-4 text-xs font-semibold text-low">{t.stepOf(i + 1, steps.length)}</p>
        <h2 id="ob-title" ref={heading} tabIndex={-1} className="mt-1 text-xl font-bold outline-none">{s.title}</h2>
        <div className="mt-2 text-sm text-mid">{s.body}</div>
        <div className="mt-5 flex gap-1.5" aria-hidden>
          {steps.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-cyan' : 'w-1.5 bg-glass-strong'}`} />
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onDone} className="min-h-11 px-2 text-sm font-semibold text-mid">{t.skip}</button>
          {last && 'share' in navigator && (
            <button
              onClick={() => navigator.share({ title: 'Super UNPAM', text: 'Semua layanan kampus UNPAM dalam satu aplikasi.', url: location.origin }).catch(() => undefined)}
              className="ml-auto flex min-h-11 items-center gap-1.5 rounded-2xl bg-glass-strong px-4 text-sm font-semibold"
            >
              <Share2 className="h-4 w-4" aria-hidden /> {t.share}
            </button>
          )}
          <button onClick={() => (last ? onDone() : setI(i + 1))} className={`btn-primary min-h-11 rounded-2xl px-5 text-sm font-semibold ${last && 'share' in navigator ? '' : 'ml-auto'}`}>
            {last ? t.start : t.next}
          </button>
        </div>
      </div>
    </div>
  )
}
