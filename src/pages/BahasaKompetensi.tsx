import { useCallback, useState } from 'react'
import { BadgeCheck, CalendarClock, ExternalLink, MapPin, RefreshCw, Wallet } from 'lucide-react'
import { ApiError } from '../lib/api'
import { rupiah } from '../lib/format'
import { sisaHari } from '../lib/kuesioner'
import { statusSumber, sumber } from '../lib/sumber'
import { useResource, type Resource } from '../lib/useResource'
import type { DariSumber, JadwalTes, PendaftaranTes, RingkasanSertifikasi, RingkasanToefl, User, UjianKompetensi } from '../lib/types'
import { Badge, LinkBtn, PageHeader, Progress, Section, Skeleton } from '../components/ui'

// TOEFL (MY LB) dan Sertifikasi (MY LSP). Data lewat src/lib/sumber: mengganti ke API resmi tidak
// mengubah komponen ini. Label sumber selalu dari statusSumber() — tidak pernah mengaku terhubung.

type Props = { user: User; back: () => void; go: (r: string) => void }

const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
const tglJam = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
/** Pengingat masa berlaku dimulai 90 hari sebelum kedaluwarsa. */
const PENGINGAT_HARI = 90

function StatusBar({ res, sistem }: { res: Resource<{ asal: string }>; sistem: 'MyLB' | 'MyLSP' }) {
  const st = statusSumber(res, sistem)
  return (
    <div className="mb-4 flex items-center justify-between gap-2" role="status">
      <Badge tone={st.tone}>{st.teks}</Badge>
      {res.error && (
        <button onClick={res.reload} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-cyan">
          <RefreshCw className="h-4 w-4" aria-hidden /> Coba lagi
        </button>
      )}
    </div>
  )
}

function Galat({ res }: { res: Resource<unknown> }) {
  if (!res.error) return null
  const belum = res.error instanceof ApiError && res.error.status === 503
  return <p className="glass p-4 text-sm text-mid">{belum ? 'Sistem sumber belum tersambung ke Super UNPAM.' : res.error.message}</p>
}

/* ---------------- TOEFL ---------------- */

export function Toefl({ back, go }: Props) {
  const ringkasan = useResource(sumber.toefl.ringkasan)
  const jadwal = useResource(sumber.toefl.daftarJadwal)
  return (
    <div>
      <PageHeader title="TOEFL & Lembaga Bahasa" onBack={back} />
      <StatusBar res={ringkasan} sistem="MyLB" />
      {ringkasan.loading && !ringkasan.data ? <Skeleton rows={2} /> : <Galat res={ringkasan} />}
      {ringkasan.data && <RingkasanToeflView r={ringkasan.data.data} />}
      <Section title="Jadwal tes">
        {jadwal.loading && !jadwal.data ? <Skeleton rows={2} /> : <Galat res={jadwal} />}
        {jadwal.data && <JadwalList jadwal={jadwal.data} pendaftaran={ringkasan.data?.data.pendaftaran ?? []} go={go} />}
      </Section>
      {ringkasan.data && (
        <Section title="Riwayat skor">
          {ringkasan.data.data.hasil.length === 0 ? (
            <p className="glass p-4 text-sm text-mid">Belum ada hasil tes.</p>
          ) : (
            <div className="glass divide-y divide-line">
              {ringkasan.data.data.hasil.map((h) => (
                <div key={h.id} className="flex items-center gap-4 p-4">
                  <div className="text-2xl font-bold">{h.skor}</div>
                  <div className="flex-1 text-xs text-mid">
                    {tgl(h.tanggal)} · berlaku s.d. {tgl(h.berlakuSampai)}
                    <br />
                    Listening {h.listening} · Structure {h.structure} · Reading {h.reading}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

function RingkasanToeflView({ r }: { r: RingkasanToefl }) {
  const berlaku = r.hasil.filter((h) => (sisaHari(h.berlakuSampai) ?? 0) > 0)
  const terbaik = berlaku.reduce<(typeof r.hasil)[number] | null>((a, h) => (!a || h.skor > a.skor ? h : a), null)
  const sisa = terbaik ? sisaHari(terbaik.berlakuSampai) : null
  const lulus = terbaik && r.target !== null ? terbaik.skor >= r.target : null
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4 text-center">
          <div className="text-3xl font-bold text-cyan">{terbaik?.skor ?? '—'}</div>
          <div className="text-xs text-mid">Skor terbaik yang masih berlaku</div>
        </div>
        <div className="glass p-4 text-center">
          <div className={`text-3xl font-bold ${lulus ? 'text-mint' : 'text-hi'}`}>{r.target === null ? '?' : lulus ? '✓' : r.target}</div>
          <div className="text-xs text-mid">{r.target === null ? 'Syarat skor belum diketahui' : `Syarat lulus (${r.target})`}</div>
        </div>
      </div>
      {terbaik && sisa !== null && sisa <= PENGINGAT_HARI && (
        <p className="glass mt-3 p-4 text-sm" role="note">
          Skor {terbaik.skor} berlaku sampai <strong>{tgl(terbaik.berlakuSampai)}</strong> ({sisa} hari lagi). Daftar tes ulang sebelum kedaluwarsa bila masih dibutuhkan.
        </p>
      )}
    </>
  )
}

const STATUS_DAFTAR: Record<PendaftaranTes['status'], [string, 'amber' | 'green' | 'slate' | 'red']> = {
  'menunggu-bayar': ['Menunggu pembayaran', 'amber'],
  terdaftar: ['Terdaftar', 'green'],
  selesai: ['Selesai', 'slate'],
  batal: ['Dibatalkan', 'red'],
}

function JadwalList({ jadwal, pendaftaran, go }: { jadwal: DariSumber<JadwalTes[]>; pendaftaran: PendaftaranTes[]; go: (r: string) => void }) {
  const [baru, setBaru] = useState<Record<string, PendaftaranTes>>({})
  const [proses, setProses] = useState('')
  const [pesan, setPesan] = useState('')
  const daftar = useCallback(async (id: string) => {
    setProses(id)
    setPesan('')
    try {
      const r = await sumber.toefl.daftar(id)
      setBaru((b) => ({ ...b, [id]: r.data }))
      setPesan(r.asal === 'contoh' ? 'Pendaftaran contoh: tidak ada yang dikirim ke MyLB.' : 'Pendaftaran terkirim ke MyLB.')
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setProses('')
    }
  }, [])

  const mendatang = jadwal.data.filter((j) => (sisaHari(j.tanggal) ?? 0) >= 0)
  if (mendatang.length === 0) return <p className="glass p-4 text-sm text-mid">Belum ada jadwal tes.</p>
  return (
    <>
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-xs text-mid">{pesan}</p>
      <div className="space-y-3">
        {mendatang.map((j) => {
          const reg = baru[j.id] ?? pendaftaran.find((p) => p.jadwalId === j.id && p.status !== 'batal')
          const sisaKursi = Math.max(0, j.kuota - j.terisi)
          const tutup = (sisaHari(j.tutupDaftar) ?? 0) < 0
          return (
            <article key={j.id} className="glass p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{j.jenis}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-mid">
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" aria-hidden /> {tglJam(j.tanggal)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden /> {j.tempat}</span>
                  </div>
                </div>
                {reg && <Badge tone={STATUS_DAFTAR[reg.status][1]}>{STATUS_DAFTAR[reg.status][0]}</Badge>}
              </div>
              <div className="mt-3">
                <Progress value={(j.terisi / j.kuota) * 100} />
                <div className="mt-1 flex justify-between text-xs text-low">
                  <span>{sisaKursi > 0 ? `Sisa ${sisaKursi} kursi` : 'Kuota penuh'}</span>
                  <span>{rupiah(j.biaya)} · tutup {tgl(j.tutupDaftar)}</span>
                </div>
              </div>
              {reg?.status === 'menunggu-bayar' ? (
                <button onClick={() => go('keuangan')} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
                  <Wallet className="h-4 w-4" aria-hidden /> Bayar di Keuangan
                </button>
              ) : (
                !reg && (
                  <button disabled={sisaKursi === 0 || tutup || proses === j.id} onClick={() => daftar(j.id)} className="btn-primary mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold">
                    {proses === j.id ? 'Mendaftar…' : sisaKursi === 0 ? 'Kuota penuh' : tutup ? 'Pendaftaran ditutup' : 'Daftar tes'}
                  </button>
                )
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

/* ---------------- Sertifikasi ---------------- */

const STATUS_UJI: Record<UjianKompetensi['status'], [string, 'blue' | 'amber' | 'green' | 'red']> = {
  terdaftar: ['Terdaftar', 'blue'],
  'pra-asesmen': ['Pra-asesmen', 'amber'],
  terjadwal: ['Terjadwal', 'blue'],
  kompeten: ['Kompeten', 'green'],
  'belum-kompeten': ['Belum kompeten', 'red'],
}

export function Sertifikasi({ user, back, go }: Props) {
  const res = useResource(sumber.sertifikasi.ringkasan)
  return (
    <div>
      <PageHeader title="Sertifikasi Kompetensi" subtitle="Lembaga Sertifikasi Profesi" onBack={back} />
      <StatusBar res={res} sistem="MyLSP" />
      {res.loading && !res.data ? <Skeleton rows={3} /> : <Galat res={res} />}
      {res.data && <SertifikasiView r={res.data.data} user={user} go={go} />}
    </div>
  )
}

function SertifikasiView({ r, user, go }: { r: RingkasanSertifikasi; user: User; go: (r: string) => void }) {
  const [ujian, setUjian] = useState(r.ujian)
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState('')
  const nama = (skemaId: string) => r.skema.find((s) => s.id === skemaId)?.nama ?? skemaId
  const tersedia = r.skema.filter((s) => s.prodi.length === 0 || s.prodi.includes(user.prodi))

  const daftar = async (skemaId: string) => {
    setProses(skemaId)
    setPesan('')
    try {
      const res = await sumber.sertifikasi.daftar(skemaId)
      setUjian((u) => [...u, res.data])
      setPesan(res.asal === 'contoh' ? 'Pendaftaran contoh: tidak ada yang dikirim ke MyLSP.' : 'Pendaftaran terkirim ke MyLSP.')
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setProses('')
    }
  }

  return (
    <>
      <Section title="Uji kompetensi saya">
        {ujian.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Belum ada pendaftaran uji kompetensi.</p>
        ) : (
          <div className="glass divide-y divide-line">
            {ujian.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{nama(u.skemaId)}</div>
                  <div className="text-xs text-mid">{u.tanggal ? `${tglJam(u.tanggal)}${u.tempat ? ` · ${u.tempat}` : ''}` : 'Jadwal menyusul'}</div>
                </div>
                <Badge tone={STATUS_UJI[u.status][1]}>{STATUS_UJI[u.status][0]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sertifikat terbit" action={r.sertifikat.length > 0 ? <LinkBtn onClick={() => go('sertifikat')}>Dompet Sertifikat</LinkBtn> : undefined}>
        {r.sertifikat.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Belum ada sertifikat kompetensi.</p>
        ) : (
          <div className="glass divide-y divide-line">
            {r.sertifikat.map((c) => (
              <button key={c.id} onClick={() => go('sertifikat')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-glass-strong">
                <BadgeCheck className="h-5 w-5 shrink-0 text-mint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{nama(c.skemaId)}</div>
                  <div className="text-xs text-mid">No. {c.nomor} · terbit {tgl(c.terbit)}{c.berlakuSampai ? ` · berlaku s.d. ${tgl(c.berlakuSampai)}` : ''}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-low" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Skema untuk ${user.prodi}`}>
        <p role="status" aria-live="polite" className="mb-2 min-h-5 text-xs text-mid">{pesan}</p>
        {tersedia.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Belum ada skema untuk program studi Anda.</p>
        ) : (
          <div className="space-y-3">
            {tersedia.map((s) => {
              const sudah = ujian.some((u) => u.skemaId === s.id) || r.sertifikat.some((c) => c.skemaId === s.id)
              return (
                <article key={s.id} className="glass flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.nama}</div>
                    <div className="text-xs text-mid">
                      {s.dibuka ? `Pendaftaran dibuka${s.tutupDaftar ? ` s.d. ${tgl(s.tutupDaftar)}` : ''}${s.biaya ? ` · ${rupiah(s.biaya)}` : ''}` : 'Pendaftaran ditutup'}
                    </div>
                  </div>
                  {sudah ? (
                    <Badge tone="green">Sudah terdaftar</Badge>
                  ) : (
                    <button disabled={!s.dibuka || proses === s.id} onClick={() => daftar(s.id)} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">
                      {proses === s.id ? 'Mendaftar…' : 'Daftar uji'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}
