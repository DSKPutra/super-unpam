import { lazy, Suspense, useMemo, useState } from 'react'
import { Mail, CalendarPlus } from 'lucide-react'
import { DAFTAR_ATURAN } from '../../../data/aturan-akademik'
import { aturanUntukProdi } from '../../../lib/akademik/aturan'
import { LABEL_STATUS, peristiwaSah, transisi } from '../../../lib/akademik/alur-skripsi'
import { hitungBimbinganSah } from '../../../lib/akademik/bimbingan'
import type { AturanAkademik, Bimbingan, JenisPeristiwa, PendaftaranUjianAkhir, ProfilAkademik, Revisi, StatusTA, TugasAkhir as TA, VersiDraf } from '../../../lib/akademik/types'
import type { Dosen } from '../../../lib/akademik/penguji'
import { getBimbingan, getDosen, getJudulTerdaftar, getProfilAkademik, getRevisi, getTugasAkhir, getVersiDraf } from '../../../lib/api'
import { pancarkan } from '../../../lib/peristiwa'
import { keIsoWib } from '../../../lib/tenggat'
import { useResource } from '../../../lib/useResource'
import type { User } from '../../../lib/types'
import { AturanContoh, StepperAlur } from '../../../components/akademik'
import { Async, Badge, PageHeader, Section, Skeleton, Tabs } from '../../../components/ui'

const Pengajuan = lazy(() => import('./Pengajuan').then((m) => ({ default: m.Pengajuan })))
const BimbinganTab = lazy(() => import('./Bimbingan').then((m) => ({ default: m.BimbinganTab })))
const UjianAkhir = lazy(() => import('./UjianAkhir').then((m) => ({ default: m.UjianAkhir })))
const Kelulusan = lazy(() => import('./Kelulusan').then((m) => ({ default: m.Kelulusan })))
const DosenTA = lazy(() => import('./Dosen').then((m) => ({ default: m.DosenTA })))

export type TabTA = 'ringkasan' | 'judul' | 'bimbingan' | 'ujian' | 'lulus'

const muat = () => Promise.all([getTugasAkhir(), getBimbingan(), getVersiDraf(), getDosen(), getProfilAkademik(), getJudulTerdaftar(), getRevisi()])

/** Status yang menandakan pembimbing sudah menyatakan layak untuk ujian berikutnya. */
const LAYAK: StatusTA[] = ['LAYAK_PROPOSAL', 'LAYAK_UJIAN_AKHIR']

export function TugasAkhir({ user, tab, go, back }: { user: User; tab: string; go: (r: string) => void; back: () => void }) {
  const aturan = useMemo(() => aturanUntukProdi(DAFTAR_ATURAN, user.prodi), [user.prodi])
  const res = useResource(muat)
  if (user.role === 'DOSEN' || user.role === 'TENDIK')
    return (
      <Suspense fallback={<Skeleton />}>
        <DosenTA user={user} aturan={aturan} back={back} />
      </Suspense>
    )
  return (
    <div>
      <PageHeader title="Skripsi / Tugas Akhir" subtitle="Dari pengajuan judul sampai lulus" onBack={back} />
      <AturanContoh aturan={aturan} />
      <Async res={res} skeleton={<Skeleton rows={4} />}>
        {([ta, bimbingan, versi, dosen, profil, judul, revisi]) => (
          <TAView awal={{ ta, bimbingan, versi, revisi }} dosen={dosen} profil={profil} judulTerdaftar={judul} aturan={aturan} tab={tab} go={go} />
        )}
      </Async>
    </div>
  )
}

export interface StateTA {
  ta: TA
  bimbingan: Bimbingan[]
  versi: VersiDraf[]
  revisi: Revisi[]
}

export interface PropsTab {
  s: StateTA
  set: (f: (s: StateTA) => StateTA) => void
  terapkan: (jenis: JenisPeristiwa, oleh: string, extra?: { alasan?: string; catatan?: string; perubahan?: Partial<TA> }) => string | null
  profil: ProfilAkademik
  aturan: AturanAkademik
  dosen: Dosen[]
  judulTerdaftar: string[]
  pendaftaran: PendaftaranUjianAkhir[]
  setPendaftaran: (f: (p: PendaftaranUjianAkhir[]) => PendaftaranUjianAkhir[]) => void
  go: (r: string) => void
}

// App me-mount ulang halaman di setiap pergantian rute (termasuk pindah tab), jadi keadaan TA
// disimpan di memori sesi (modul), bukan di state komponen. Mode BFF: sumbernya server.
let sesiTA: { s: StateTA; pendaftaran: PendaftaranUjianAkhir[] } | null = null

function TAView({ awal, ...p }: { awal: StateTA; dosen: Dosen[]; profil: ProfilAkademik; judulTerdaftar: string[]; aturan: AturanAkademik; tab: string; go: (r: string) => void }) {
  const [s, setS] = useState<StateTA>(() => sesiTA?.s ?? awal)
  const [pendaftaran, setP] = useState<PendaftaranUjianAkhir[]>(() => sesiTA?.pendaftaran ?? [])
  const set = (f: (x: StateTA) => StateTA) =>
    setS((x) => {
      const n = f(x)
      sesiTA = { s: n, pendaftaran: sesiTA?.pendaftaran ?? pendaftaran }
      return n
    })
  const setPendaftaran = (f: (x: PendaftaranUjianAkhir[]) => PendaftaranUjianAkhir[]) =>
    setP((x) => {
      const n = f(x)
      sesiTA = { s: sesiTA?.s ?? s, pendaftaran: n }
      return n
    })
  const aktif = (['ringkasan', 'judul', 'bimbingan', 'ujian', 'lulus'].includes(p.tab) ? p.tab : 'ringkasan') as TabTA

  // Profil untuk kelayakan memakai data terbaru dari layar ini (bimbingan sah, persetujuan, berkas).
  const profil: ProfilAkademik = {
    ...p.profil,
    bimbinganDisetujui: hitungBimbinganSah(s.bimbingan),
    persetujuanPembimbing: LAYAK.includes(s.ta.status),
    berkasTerverifikasi: pendaftaran.flatMap((x) => x.berkas.filter((b) => b.status === 'DIVERIFIKASI').map((b) => b.idAturan)),
  }

  /** Satu-satunya cara mengubah status TA: lewat mesin alur. Mengembalikan galat atau null. */
  const terapkan: PropsTab['terapkan'] = (jenis, oleh, extra = {}) => {
    const ta = { ...s.ta, ...extra.perubahan }
    const r = transisi({ status: ta.status, riwayat: ta.riwayat }, { jenis, oleh, pada: keIsoWib(new Date()), alasan: extra.alasan, catatan: extra.catatan }, { judul: ta.judul, pilihanPembimbing: ta.pilihanPembimbing, pembimbing: ta.pembimbing.map((x) => x.nidn) })
    if (!r.ok) return r.galat
    set((st) => ({ ...st, ta: { ...ta, status: r.keadaan.status, riwayat: r.keadaan.riwayat } }))
    pancarkan({ judul: `Skripsi/TA: ${LABEL_STATUS[r.keadaan.status]}`, isi: extra.alasan ?? extra.catatan ?? `Status berubah oleh ${oleh}`, rute: 'ta' })
    return null
  }

  const props: PropsTab = { s, set, terapkan, profil, aturan: p.aturan, dosen: p.dosen, judulTerdaftar: p.judulTerdaftar, pendaftaran, setPendaftaran, go: p.go }
  return (
    <>
      <Tabs
        value={aktif}
        onChange={(v) => p.go(v === 'ringkasan' ? 'ta' : `ta/${v}`)}
        options={[
          ['ringkasan', 'Ringkasan'],
          ['judul', 'Judul'],
          ['bimbingan', 'Bimbingan'],
          ['ujian', 'Ujian'],
          ['lulus', 'Lulus'],
        ]}
      />
      <Suspense fallback={<Skeleton />}>
        {aktif === 'ringkasan' && <Ringkasan {...props} />}
        {aktif === 'judul' && <Pengajuan {...props} />}
        {aktif === 'bimbingan' && <BimbinganTab {...props} />}
        {aktif === 'ujian' && <UjianAkhir {...props} />}
        {aktif === 'lulus' && <Kelulusan {...props} />}
      </Suspense>
    </>
  )
}

/** Demo: prodi menetapkan pilihan pertama sebagai pembimbing 1. Di sistem asli diputuskan server. */
const tetapkanPembimbing = (pilihan: string[], dosen: Dosen[]) =>
  pilihan.slice(0, 1).flatMap((nidn) => dosen.filter((d) => d.nidn === nidn).map((d) => ({ nidn: d.nidn, nama: d.nama, email: d.email, urutan: 1 as const })))

const OLEH: Partial<Record<JenisPeristiwa, string>> = {
  SETUJUI_PEMBIMBING: 'Prodi (demo)',
  TOLAK: 'Prodi (demo)',
  MULAI_BIMBINGAN: 'Pembimbing (demo)',
  NYATAKAN_LAYAK_PROPOSAL: 'Pembimbing (demo)',
  NYATAKAN_LAYAK_AKHIR: 'Pembimbing (demo)',
  JADWALKAN_UJIAN: 'Prodi (demo)',
  LULUS: 'Tim penguji (demo)',
  LULUS_DENGAN_REVISI: 'Tim penguji (demo)',
  TIDAK_LULUS: 'Tim penguji (demo)',
  REVISI_DISETUJUI: 'Penguji (demo)',
  SELESAIKAN: 'Fakultas (demo)',
}

function Ringkasan({ s, terapkan, go, dosen }: PropsTab) {
  const [galat, setGalat] = useState('')
  const pihakLain = peristiwaSah(s.ta.status).filter((e) => OLEH[e])
  return (
    <div>
      <div className="glass p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={s.ta.status === 'DITOLAK' ? 'red' : s.ta.status === 'SELESAI' ? 'green' : 'blue'}>{LABEL_STATUS[s.ta.status]}</Badge>
          <span className="text-xs text-low">{s.ta.id}</span>
        </div>
        <h2 className="font-display text-lg font-bold leading-snug">{s.ta.judul || 'Judul belum diisi'}</h2>
        <p className="mt-1 text-sm text-mid">{s.ta.bidang}</p>
        <div className="mt-4">
          <StepperAlur status={s.ta.status} riwayat={s.ta.riwayat} />
        </div>
      </div>

      <Section title="Pembimbing">
        {s.ta.pembimbing.length === 0 ? (
          <div className="glass p-4 text-sm text-mid">Belum ditetapkan. Ajukan judul dan pilihan pembimbing di tab Judul.</div>
        ) : (
          <div className="space-y-2">
            {s.ta.pembimbing.map((d) => (
              <div key={d.nidn} className="glass flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{d.nama}</div>
                  <div className="text-xs text-low">Pembimbing {d.urutan} · NIDN {d.nidn}</div>
                </div>
                <a href={`mailto:${d.email}`} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                  <Mail className="h-4 w-4" aria-hidden /> {d.email}
                </a>
                <button onClick={() => go('booking')} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
                  <CalendarPlus className="h-4 w-4" aria-hidden /> Jadwalkan bimbingan
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {pihakLain.length > 0 && (
        <Section title="Simulasi keputusan pihak lain (demo)">
          <div className="glass p-4">
            <p className="mb-3 text-xs text-mid">Di sistem asli, langkah ini dilakukan prodi/pembimbing/penguji di server. Di sini hanya untuk mencoba alur, dan setiap langkah tetap divalidasi mesin status.</p>
            <div className="flex flex-wrap gap-2">
              {pihakLain.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    const butuhAlasan = e === 'TOLAK' || e === 'TIDAK_LULUS'
                    const alasan = butuhAlasan ? prompt('Alasan (wajib):') ?? '' : undefined
                    setGalat(terapkan(e, OLEH[e]!, { alasan, perubahan: e === 'SETUJUI_PEMBIMBING' && s.ta.pembimbing.length === 0 ? { pembimbing: tetapkanPembimbing(s.ta.pilihanPembimbing, dosen) } : undefined }) ?? '')
                  }}
                  className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold"
                >
                  {e.replace(/_/g, ' ').toLowerCase()}
                </button>
              ))}
            </div>
            {galat && (
              <p role="alert" className="mt-2 text-xs text-rose">
                {galat}
              </p>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}
