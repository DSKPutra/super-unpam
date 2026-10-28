import { ExternalLink, GraduationCap, Info, Map, MapPin, PlayCircle } from 'lucide-react'
import { FAKULTAS, KONTAK, LAYANAN, LOKASI, MOTO, SEJARAH, tautanPeta } from '../data/kampus'
import type { Dict } from '../lib/i18n'
import { PageHeader, Section } from '../components/ui'

// U06: halaman permanen "Kenali Kampus" — data sama dengan onboarding (src/data/kampus.ts).

const luar = { target: '_blank', rel: 'noopener noreferrer' } as const
const tgl = (d: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(`${d}T00:00:00`))

export function KenaliKampus({ t, back, replayIntro }: { t: Dict; back: () => void; replayIntro: () => void }) {
  const dicek = [...new Set([MOTO, ...LOKASI, ...FAKULTAS, ...LAYANAN, ...KONTAK].map((x) => x.dicek))].sort().pop()!
  return (
    <div className="page-enter">
      <PageHeader title={t.kenaliKampus} subtitle={t.kenaliKampusNote} onBack={back} />
      <div className="glass p-5">
        <div className="text-xs uppercase tracking-[0.16em] text-mid">Universitas Pamulang</div>
        <p className="mt-1 font-display text-xl font-bold text-cyan">“{MOTO.teks}”</p>
        {SEJARAH && <p className="mt-2 text-sm text-mid">{SEJARAH.teks}</p>}
        <button onClick={replayIntro} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
          <PlayCircle className="h-4 w-4" aria-hidden /> {t.replayIntro}
        </button>
      </div>

      <Section title={t.lokasi}>
        <ul className="space-y-3">
          {LOKASI.map((l) => {
            const peta = tautanPeta(l.alamat)
            return (
              <li key={l.id} className="glass p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="font-semibold">{l.nama}</h3>
                    <p className="text-sm text-mid">{l.alamat}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={peta.geo} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-sm font-semibold">
                    <Map className="h-4 w-4" aria-hidden /> {t.openMapApp}<span className="sr-only">: {l.nama}</span>
                  </a>
                  <a href={peta.web} {...luar} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-cyan">
                    {t.openMapWeb} <ExternalLink className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">: {l.nama}</span>
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title={t.obFakultasTitle}>
        <p className="mb-2 text-xs text-low">{t.obFakultasText}</p>
        <ul className="glass grid grid-cols-1 divide-y divide-line overflow-hidden sm:grid-cols-2 sm:divide-y-0">
          {FAKULTAS.map((f) => (
            <li key={f.id}>
              <a href={f.url} {...luar} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-glass-strong">
                <GraduationCap className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
                <span className="flex-1 text-sm font-semibold">{f.nama}</span>
                <ExternalLink className="h-3.5 w-3.5 text-low" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.layananPenting}>
        <ul className="glass divide-y divide-line overflow-hidden">
          {LAYANAN.map((l) => (
            <li key={l.id}>
              <a href={l.url} {...luar} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-glass-strong">
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{l.nama}</span>
                  <span className="block text-xs text-low">{t.serviceHours}: {l.jam ?? t.notYetAvailable}</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-low" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.kontakResmi}>
        <ul className="glass divide-y divide-line overflow-hidden">
          {KONTAK.map((k) => (
            <li key={k.id}>
              <a href={k.href} {...luar} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-glass-strong">
                <span className="text-sm text-mid">{k.label}</span>
                <span className="text-sm font-semibold text-cyan">{k.nilai}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.dataSource}>
        <p className="glass flex gap-2 p-4 text-xs text-mid">
          <Info className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
          <span>
            {t.dataNote(tgl(dicek))}{' '}
            <a href="https://unpam.ac.id/" {...luar} className="font-semibold text-cyan underline">unpam.ac.id</a> ·{' '}
            <a href="https://lp3.unpam.ac.id/fakultas-program-studi" {...luar} className="font-semibold text-cyan underline">lp3.unpam.ac.id</a>
          </span>
        </p>
      </Section>
    </div>
  )
}
