import { AlarmClock, CalendarClock, CreditCard, GraduationCap, ListChecks, NotebookPen } from 'lucide-react'
import { sesiKeTenggat } from '../../lib/akademik/ics-ujian'
import { getBills, getTasks, getUjianSemester } from '../../lib/api'
import { usePeristiwa } from '../../lib/peristiwa'
import { formatJamWib, formatTanggalWib, tagihanKeTenggat, tugasKeTenggat, urgensi, urutkanTenggat, type SumberTenggat, type Tenggat as T, type Urgensi } from '../../lib/tenggat'
import { useResource } from '../../lib/useResource'
import { TombolIcs } from '../../components/akademik'
import { Async, Badge, PageHeader, Section, Skeleton } from '../../components/ui'

// Pusat Tenggat: radar semua tenggat (ujian, tugas, tagihan, bimbingan, revisi) + ekspor .ics.
const muat = () => Promise.all([getUjianSemester(), getTasks(), getBills()])

const IKON: Record<SumberTenggat, typeof AlarmClock> = { ujian: NotebookPen, tugas: ListChecks, keuangan: CreditCard, bimbingan: GraduationCap, revisi: GraduationCap, pengajuan: CalendarClock }
const GRUP: { id: Urgensi; judul: string; tone: 'red' | 'amber' | 'blue' | 'slate' }[] = [
  { id: 'terlambat', judul: 'Terlambat', tone: 'red' },
  { id: 'hari-ini', judul: 'Hari ini', tone: 'amber' },
  { id: 'minggu-ini', judul: '7 hari ke depan', tone: 'blue' },
  { id: 'nanti', judul: 'Nanti', tone: 'slate' },
]

export function Tenggat({ back, go }: { back: () => void; go: (r: string) => void }) {
  const res = useResource(muat)
  const peristiwa = usePeristiwa()
  return (
    <div>
      <PageHeader title="Pusat Tenggat" subtitle="Semua jadwal & batas waktu dalam satu tempat (WIB)" onBack={back} />
      <Async res={res} skeleton={<Skeleton rows={4} />}>
        {([ujian, tugas, tagihan]) => {
          const sekarang = new Date()
          const semua: T[] = [
            ...ujian.map((u) => sesiKeTenggat(u.sesi)),
            ...tugas.map(tugasKeTenggat),
            ...tagihan.map(tagihanKeTenggat),
            ...peristiwa.flatMap((p) => (p.tenggat ? [p.tenggat] : [])),
          ]
          // Hapus duplikat (mis. jadwal ujian yang juga dipancarkan sebagai peristiwa).
          const unik = [...new Map(semua.map((t) => [t.id, t])).values()].filter((t) => !t.selesaiDikerjakan)
          const urut = urutkanTenggat(unik, sekarang)
          return (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-mid">{urut.length} tenggat aktif</p>
                <TombolIcs tenggat={urut} nama="pusat-tenggat.ics">
                  Ekspor semua (.ics)
                </TombolIcs>
              </div>
              {urut.length === 0 && <div className="glass p-6 text-center text-sm text-mid">Tidak ada tenggat aktif.</div>}
              {GRUP.map((g) => {
                const isi = urut.filter((t) => urgensi(t, sekarang) === g.id)
                if (!isi.length) return null
                return (
                  <Section key={g.id} title={`${g.judul} · ${isi.length}`}>
                    <ul className="glass divide-y divide-line overflow-hidden">
                      {isi.map((t) => {
                        const Ikon = IKON[t.sumber]
                        return (
                          <li key={t.id}>
                            <button onClick={() => t.rute && go(t.rute)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-glass-strong">
                              <Ikon className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{t.judul}</span>
                                <span className="block text-xs text-low">
                                  {formatTanggalWib(t.waktu)} · {formatJamWib(t.waktu)} WIB{t.lokasi ? ` · ${t.lokasi}` : ''}
                                </span>
                              </span>
                              <Badge tone={g.tone}>{g.judul}</Badge>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </Section>
                )
              })}
            </>
          )
        }}
      </Async>
    </div>
  )
}
