import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle, Armchair, CalendarClock, CheckCircle2, Clock, History, MapPin, Printer, ScrollText, XCircle } from 'lucide-react'
import { DAFTAR_ATURAN } from '../../data/aturan-akademik'
import { aturanUntukProdi } from '../../lib/akademik/aturan'
import { deteksiBentrok, deteksiBeruntun } from '../../lib/akademik/bentrok'
import { sesiKeTenggat } from '../../lib/akademik/ics-ujian'
import { evaluasiKelayakan } from '../../lib/akademik/kelayakan'
import type { AturanAkademik, JenisUjianSemester, ProfilAkademik, Ujian as UjianT } from '../../lib/akademik/types'
import { getProfilAkademik, getUjianSemester } from '../../lib/api'
import { pancarkan } from '../../lib/peristiwa'
import { formatJamWib, formatTanggalWib } from '../../lib/tenggat'
import { useResource } from '../../lib/useResource'
import type { User } from '../../lib/types'
import { AturanContoh, DaftarSyarat, TombolIcs, UnggahBerkas, metaBerkas, waktuSesi } from '../../components/akademik'
import { Async, Badge, PageHeader, Section, Skeleton, Tabs } from '../../components/ui'

// Exam Center v2 (T02): UTS, UAS, susulan, remedial. Data dari adapter (src/lib/api.ts),
// aturan dari src/data/aturan-akademik.ts; tidak ada data/angka ujian yang ditulis di komponen.

type Tab = 'UTS' | 'UAS' | 'PENGAJUAN'

const muat = () => Promise.all([getUjianSemester(), getProfilAkademik()])

export function Ujian({ user, back, go }: { user: User; back: () => void; go: (r: string) => void }) {
  const res = useResource(muat)
  const aturan = useMemo(() => aturanUntukProdi(DAFTAR_ATURAN, user.prodi), [user.prodi])
  return (
    <div>
      <PageHeader title="Exam Center" subtitle="UTS, UAS, susulan & remedial" onBack={back} />
      <AturanContoh aturan={aturan} />
      <Async res={res} skeleton={<Skeleton rows={4} />}>
        {([ujian, profil]) => <ExamCenter ujian={ujian} profil={profil} aturan={aturan} go={go} />}
      </Async>
    </div>
  )
}

function ExamCenter({ ujian, profil, aturan, go }: { ujian: UjianT[]; profil: ProfilAkademik; aturan: AturanAkademik; go: (r: string) => void }) {
  const [tab, setTab] = useState<Tab>('UTS')
  const daftar = ujian.filter((u) => u.jenis === tab).sort((a, b) => a.sesi.mulai.localeCompare(b.sesi.mulai))
  const sesi = daftar.map((u) => u.sesi)
  const bentrok = deteksiBentrok(sesi, profil.nim)
  const beruntun = deteksiBeruntun(sesi, profil.nim, aturan.ujianSemester.jedaBeruntunMenit)
  const semester = daftar[0]?.semester

  // Perubahan jadwal → peristiwa notifikasi (sekali per sesi).
  useEffect(() => {
    for (const u of ujian.filter((x) => x.sesi.sebelumnya))
      pancarkan({ judul: `Jadwal ${u.jenis} berubah`, isi: `${u.sesi.judul}: kini ${formatTanggalWib(u.sesi.mulai)} ${formatJamWib(u.sesi.mulai)} WIB`, rute: 'ujian', tenggat: sesiKeTenggat(u.sesi) })
  }, [ujian])

  return (
    <>
      <Tabs value={tab} onChange={setTab} options={[['UTS', 'UTS'], ['UAS', 'UAS'], ['PENGAJUAN', 'Susulan & remedial']]} />
      {tab === 'PENGAJUAN' ? (
        <Pengajuan ujian={ujian} aturan={aturan} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-mid">{semester ? `Semester ${semester}` : 'Belum ada jadwal'}</p>
            <div className="flex gap-2">
              <TombolIcs tenggat={sesi.map((s) => sesiKeTenggat(s))} nama={`jadwal-${tab.toLowerCase()}.ics`}>
                Semua ke kalender
              </TombolIcs>
              <button onClick={() => window.print()} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                <Printer className="h-4 w-4" aria-hidden /> Cetak kartu
              </button>
            </div>
          </div>

          {bentrok.length > 0 && (
            <div role="alert" className="glass mb-3 border-[color-mix(in_srgb,var(--rose)_40%,transparent)] p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-rose">
                <XCircle className="h-4 w-4" aria-hidden /> Jadwal bentrok terdeteksi
              </p>
              <ul className="mt-1 list-disc pl-6 text-mid">
                {bentrok.map((b) => (
                  <li key={b.a.id + b.b.id}>
                    {b.a.judul} dan {b.b.judul} ({formatTanggalWib(b.a.mulai)}). Laporkan ke prodi lewat Aspirasi atau BAAK.
                  </li>
                ))}
              </ul>
            </div>
          )}
          {beruntun.length > 0 && (
            <div className="glass mb-3 p-4 text-sm" role="note">
              <p className="flex items-center gap-2 font-semibold text-amber">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Ujian beruntun
              </p>
              <ul className="mt-1 list-disc pl-6 text-mid">
                {beruntun.map((b) => (
                  <li key={b.a.id + b.b.id}>
                    {b.a.judul} → {b.b.judul}: jeda {b.jedaMenit} menit (kurang dari {aturan.ujianSemester.jedaBeruntunMenit} menit).
                  </li>
                ))}
              </ul>
            </div>
          )}

          {daftar.length === 0 ? (
            <div className="glass p-6 text-center text-sm text-mid">Jadwal {tab} belum diterbitkan.</div>
          ) : (
            <div className="space-y-3">
              {daftar.map((u) => (
                <KartuUjian key={u.id} u={u} profil={profil} aturan={aturan} go={go} bentrok={bentrok.some((b) => b.a.id === u.id || b.b.id === u.id)} />
              ))}
            </div>
          )}

          <Section title={`Tata tertib ${tab}`}>
            <ul className="glass space-y-2 p-4 text-sm">
              {aturan.ujianSemester.tataTertib[tab].map((r) => (
                <li key={r} className="flex gap-2">
                  <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden /> {r}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </>
  )
}

function KartuUjian({ u, profil, aturan, go, bentrok }: { u: UjianT; profil: ProfilAkademik; aturan: AturanAkademik; go: (r: string) => void; bentrok: boolean }) {
  const hasil = evaluasiKelayakan(profil, { jenis: u.jenis, kodeMk: u.sesi.kodeMk }, aturan)
  const [qr, setQr] = useState('')
  const [buka, setBuka] = useState(false)
  useEffect(() => {
    if (!buka || !hasil.layak) return
    // QR hanya berisi ID kartu; server memverifikasi kepemilikan & kelayakan. TODO(BFF): ID ditandatangani.
    QRCode.toDataURL(`SUPERUNPAM:UJIAN:${u.idKartu}`, { margin: 1, width: 200 }).then(setQr)
  }, [buka, hasil.layak, u.idKartu])

  const s = u.sesi
  return (
    <article className="glass p-4 print:break-inside-avoid" aria-label={`${s.judul}, ${hasil.layak ? 'boleh ikut' : 'belum memenuhi syarat'}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-low">{s.kodeMk}</div>
          <h3 className="font-semibold">{s.judul}</h3>
        </div>
        {s.sebelumnya && (
          <Badge tone="amber">
            <History className="h-3 w-3" aria-hidden /> Berubah
          </Badge>
        )}
        {bentrok && <Badge tone="red">Bentrok</Badge>}
        {hasil.layak ? (
          <Badge tone="green">
            <CheckCircle2 className="h-3 w-3" aria-hidden /> Boleh ikut
          </Badge>
        ) : (
          <Badge tone="red">
            <XCircle className="h-3 w-3" aria-hidden /> Belum memenuhi syarat
          </Badge>
        )}
      </div>

      <div className="mt-2 grid gap-2 text-xs text-mid sm:grid-cols-3">
        <span className="flex items-center gap-1">
          <CalendarClock className="h-4 w-4 text-cyan" aria-hidden /> {waktuSesi(s)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-rose" aria-hidden /> {s.ruang}
        </span>
        <span className="flex items-center gap-1">
          <Armchair className="h-4 w-4 text-amber" aria-hidden /> Kursi {s.kursi ?? '-'} · Pengawas: {s.pengawas?.join(', ') ?? '-'}
        </span>
      </div>
      {s.sebelumnya && (
        <p className="mt-2 text-xs text-amber">
          Sebelumnya: <s>{waktuSesi(s.sebelumnya)} · {s.sebelumnya.ruang}</s>
        </p>
      )}

      {hasil.layak ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={() => setBuka((b) => !b)} aria-expanded={buka} className="btn-primary min-h-11 rounded-xl px-4 text-xs font-semibold">
            {buka ? 'Sembunyikan kartu' : 'Tampilkan kartu ujian'}
          </button>
          <TombolIcs tenggat={[sesiKeTenggat(s)]} nama={`${s.kodeMk}-${u.jenis}.ics`} />
          {buka && qr && (
            <div className="flex w-full items-center gap-4 pt-2">
              <img src={qr} alt={`QR kartu ujian ${u.idKartu}`} width={128} height={128} className="h-32 w-32 rounded-xl bg-white p-1.5" />
              <div className="text-xs text-mid">
                <div className="font-mono text-sm font-bold text-hi">{u.idKartu}</div>
                Tunjukkan ke pengawas. QR hanya berisi ID kartu, bukan NIM.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-glass-strong p-3">
          <p className="mb-2 text-xs font-semibold">Kartu ujian belum dapat diterbitkan:</p>
          <DaftarSyarat hasil={{ ...hasil, syarat: hasil.syarat.filter((x) => !x.terpenuhi) }} go={go} />
        </div>
      )}
    </article>
  )
}

type StatusPengajuan = 'DIAJUKAN' | 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK'
const ALUR_PENGAJUAN: StatusPengajuan[] = ['DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI']

function Pengajuan({ ujian, aturan }: { ujian: UjianT[]; aturan: AturanAkademik }) {
  const [jenis, setJenis] = useState<Extract<JenisUjianSemester, 'SUSULAN' | 'REMEDIAL'>>('SUSULAN')
  const [mk, setMk] = useState(ujian[0]?.id ?? '')
  const [alasan, setAlasan] = useState('')
  const [bukti, setBukti] = useState<{ nama: string; ukuran: number; sha256: string } | null>(null)
  const [list, setList] = useState<{ id: string; jenis: string; judul: string; status: StatusPengajuan; bukti?: string }[]>([])
  const target = ujian.find((u) => u.id === mk)
  const batas = target ? new Date(new Date(target.sesi.selesai).getTime() + aturan.ujianSemester.batasPengajuanSusulanHari * 86400_000).toISOString() : null
  const field = 'mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4 outline-none focus:border-cyan'

  return (
    <div>
      <form
        className="glass space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!target) return
          const id = `PS-${Date.now().toString(36).toUpperCase()}`
          setList((l) => [{ id, jenis, judul: target.sesi.judul, status: 'DIAJUKAN', bukti: bukti ? metaBerkas(bukti) : undefined }, ...l])
          pancarkan({ judul: `Pengajuan ${jenis.toLowerCase()} terkirim`, isi: `${target.sesi.judul} · menunggu verifikasi`, rute: 'ujian' })
          setAlasan('')
          setBukti(null)
        }}
      >
        <fieldset>
          <legend className="text-sm font-semibold">Jenis pengajuan</legend>
          <div className="mt-2 flex gap-2">
            {(['SUSULAN', 'REMEDIAL'] as const).map((j) => (
              <label key={j} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3 text-sm">
                <input type="radio" name="jenis" checked={jenis === j} onChange={() => setJenis(j)} className="accent-[var(--primary)]" /> {j === 'SUSULAN' ? 'Ujian susulan' : 'Remedial'}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-semibold">
          Mata kuliah / ujian
          <select value={mk} onChange={(e) => setMk(e.target.value)} className={field}>
            {ujian.map((u) => (
              <option key={u.id} value={u.id}>
                {u.jenis} · {u.sesi.judul}
              </option>
            ))}
          </select>
        </label>
        {batas && (
          <p className="flex items-center gap-1.5 text-xs text-mid">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Batas pengajuan: {formatTanggalWib(batas)} (H+{aturan.ujianSemester.batasPengajuanSusulanHari} setelah ujian)
          </p>
        )}
        <label className="block text-sm font-semibold">
          Alasan
          <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} required minLength={10} className="mt-1.5 min-h-24 w-full rounded-2xl border border-line bg-glass p-4 outline-none focus:border-cyan" />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Bukti pendukung (mis. surat dokter)</p>
          <UnggahBerkas aturan={{ tipe: ['application/pdf', 'image/jpeg', 'image/png'], maksMB: 5 }} label="Pilih berkas bukti" onSelesai={setBukti} />
          {bukti && <p className="mt-1 text-xs text-mint">✓ {metaBerkas(bukti)}</p>}
        </div>
        <button disabled={!bukti} className="btn-primary min-h-12 w-full rounded-2xl font-semibold">
          {bukti ? 'Ajukan' : 'Unggah bukti dulu'}
        </button>
      </form>

      {list.length > 0 && (
        <Section title="Pengajuan saya">
          <div className="space-y-3">
            {list.map((p) => (
              <article key={p.id} className="glass p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {p.jenis === 'SUSULAN' ? 'Susulan' : 'Remedial'} · {p.judul}
                    </div>
                    <div className="text-xs text-low">
                      {p.id}
                      {p.bukti && ` · ${p.bukti}`}
                    </div>
                  </div>
                  <Badge tone={p.status === 'DISETUJUI' ? 'green' : p.status === 'DITOLAK' ? 'red' : 'amber'}>{p.status.toLowerCase()}</Badge>
                </div>
                <ol className="mt-3 grid grid-cols-3 gap-1 text-[11px] text-mid">
                  {ALUR_PENGAJUAN.map((a, i) => (
                    <li key={a} className="flex flex-col items-center gap-1 text-center">
                      {ALUR_PENGAJUAN.indexOf(p.status) >= i ? <CheckCircle2 className="h-4 w-4 text-mint" aria-label="selesai" /> : <span className="h-4 w-4 rounded-full border border-line" aria-label="belum" />}
                      {a.toLowerCase()}
                    </li>
                  ))}
                </ol>
                {p.status !== 'DISETUJUI' && p.status !== 'DITOLAK' && (
                  <button
                    onClick={() => setList((l) => l.map((x) => (x.id === p.id ? { ...x, status: ALUR_PENGAJUAN[ALUR_PENGAJUAN.indexOf(x.status) + 1] } : x)))}
                    className="mt-2 min-h-11 text-xs font-semibold text-cyan"
                  >
                    Simulasikan langkah berikutnya (demo)
                  </button>
                )}
              </article>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
