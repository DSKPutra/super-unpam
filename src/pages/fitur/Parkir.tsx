import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Bike, Car, CheckCircle2, Clock, History, LogIn, LogOut, MapPinned, Plus, ScanLine, ShieldCheck, Snowflake, Trash2, XCircle } from 'lucide-react'
import { ATURAN_PARKIR as ATURAN, type JenisKendaraan } from '../../data/aturan-parkir'
import { daftarKendaraan, demoVerifikasiKendaraan, getParkir, hapusKendaraan, issueQr, pindaiGerbang, qrPayload, USE_DEMO } from '../../lib/api'
import { arahBerikutnya, bolehHapus, durasiMenit, formatDurasi, normalisasiPlat, okupansi, type Arah, type HasilGerbang, type Kendaraan } from '../../lib/parkir'
import type { RingkasanParkir } from '../../lib/parkir-store'
import type { User } from '../../lib/types'
import { useResource } from '../../lib/useResource'
import { Icon3D } from '../../components/Icon3D'
import { Async, Badge, PageHeader, Progress, Section, Skeleton, Tabs } from '../../components/ui'
import { useDynamicQr } from '../Ktm'

// Parkir kampus dengan KTM Digital: QR parkir dinamis per kendaraan untuk gerbang masuk/keluar,
// pendaftaran kendaraan + STNK, status parkir, keterisian area, dan riwayat. Petugas (TENDIK) punya
// mode pemindai gerbang. Keputusan gerbang (anti-passback, kapasitas, jam operasi) ada di src/lib/parkir.ts.

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short' })
const IkonJenis = ({ jenis, className = 'h-5 w-5' }: { jenis: JenisKendaraan; className?: string }) => (jenis === 'mobil' ? <Car className={className} aria-hidden /> : <Bike className={className} aria-hidden />)
const rupiah = (n: number | null | undefined) => (n == null ? 'Tanpa tarif' : `Rp${n.toLocaleString('id-ID')}`)

export function Parkir({ user, back, go }: { user: User; back: () => void; go: (r: string) => void }) {
  const petugas = user.role === 'TENDIK'
  const [mode, setMode] = useState<'saya' | 'petugas'>('saya')
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Parkir Kampus" subtitle="Masuk & keluar gerbang parkir pakai KTM Digital" onBack={back} />
      {petugas && (
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            ['saya', 'Kendaraan saya'],
            ['petugas', 'Petugas gerbang'],
          ]}
        />
      )}
      {mode === 'petugas' && petugas ? <Petugas /> : <Pemilik go={go} />}
    </div>
  )
}

// — Pemilik kendaraan —

function Pemilik({ go }: { go: (r: string) => void }) {
  const res = useResource(getParkir)
  return (
    <Async res={res} skeleton={<Skeleton rows={4} />}>
      {(d) => <PemilikIsi d={d} reload={res.reload} go={go} />}
    </Async>
  )
}

function PemilikIsi({ d, reload, go }: { d: RingkasanParkir; reload: () => void; go: (r: string) => void }) {
  const [tab, setTab] = useState<'kendaraan' | 'area' | 'riwayat'>('kendaraan')
  const siap = d.kendaraan.filter((k) => k.status === 'terverifikasi')
  // Saat parkir, QR yang dipakai harus kendaraan yang sama dengan saat masuk.
  const [pilih, setPilih] = useState(d.sesiAktif?.kendaraanId ?? siap[0]?.id ?? '')
  const aktifId = d.sesiAktif?.kendaraanId ?? (siap.some((k) => k.id === pilih) ? pilih : siap[0]?.id ?? '')
  const kendaraan = d.kendaraan.find((k) => k.id === aktifId)

  return (
    <>
      {d.ktmBeku && (
        <div role="alert" className="glass mb-4 flex items-start gap-3 border border-[color-mix(in_srgb,var(--rose)_40%,transparent)] p-4">
          <Snowflake className="mt-0.5 h-5 w-5 shrink-0 text-rose" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold">KTM sedang dibekukan</p>
            <p className="text-mid">QR parkir tidak diterbitkan dan gerbang akan menolak KTM ini.</p>
            <button onClick={() => go('ktm')} className="mt-1 min-h-11 font-semibold text-cyan hover:underline">Buka pengaturan KTM</button>
          </div>
        </div>
      )}

      <StatusParkir d={d} />

      <Section title={`QR gerbang ${arahBerikutnya(d) === 'masuk' ? 'masuk' : 'keluar'}`}>
        {siap.length === 0 ? (
          <div className="glass p-5 text-center text-sm text-mid">
            Belum ada kendaraan terverifikasi. Daftarkan kendaraan beserta STNK di bawah.
          </div>
        ) : (
          <>
            {!d.sesiAktif && siap.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Pilih kendaraan">
                {siap.map((k) => (
                  <button key={k.id} role="radio" aria-checked={aktifId === k.id} onClick={() => setPilih(k.id)} className={`glass flex min-h-11 items-center gap-2 !rounded-full px-4 text-sm font-semibold ${aktifId === k.id ? 'ring-2 ring-[var(--primary)]' : ''}`}>
                    <IkonJenis jenis={k.jenis} className="h-4 w-4" /> {k.plat}
                  </button>
                ))}
              </div>
            )}
            {kendaraan && <QrParkir k={kendaraan} beku={d.ktmBeku} arah={arahBerikutnya(d)} />}
            {USE_DEMO && kendaraan && !d.ktmBeku && <SimulasiGerbang d={d} k={kendaraan} selesai={reload} />}
          </>
        )}
      </Section>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ['kendaraan', 'Kendaraan'],
          ['area', 'Area'],
          ['riwayat', 'Riwayat'],
        ]}
      />
      {tab === 'kendaraan' && <DaftarKendaraan d={d} reload={reload} />}
      {tab === 'area' && <AreaList d={d} />}
      {tab === 'riwayat' && <Riwayat d={d} />}

      <Aturan />
    </>
  )
}

function StatusParkir({ d }: { d: RingkasanParkir }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const s = d.sesiAktif
  return (
    <div className="glass flex items-center gap-4 p-4">
      <Icon3D icon={s ? Car : MapPinned} from={s ? '#4DF0E0' : '#A58CFF'} to={s ? '#0B8F9F' : '#5B3FE0'} size={52} />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-low">Status parkir</p>
        {s ? (
          <>
            <p className="font-display text-lg font-bold">Sedang parkir · {formatDurasi(durasiMenit(s.masuk, now))}</p>
            <p className="truncate text-sm text-mid">{s.plat} · {s.areaNama} · masuk {jam(s.masuk)} WIB</p>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-bold">Tidak sedang parkir</p>
            <p className="text-sm text-mid">Tunjukkan QR di bawah ke pemindai gerbang masuk.</p>
          </>
        )}
      </div>
      <Badge tone={s ? 'green' : 'slate'}>{s ? 'Di dalam' : 'Di luar'}</Badge>
    </div>
  )
}

function QrParkir({ k, beku, arah }: { k: Kendaraan; beku: boolean; arah: Arah }) {
  const { src, code, left, period, error } = useDynamicQr('PARKIR', beku ? '' : k.id)
  return (
    <div className="glass flex flex-col items-center p-5">
      <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-2 shadow-[var(--glow)]">
        {src ? <img src={src} alt={`QR parkir ${k.plat}`} className="h-52 w-52" /> : beku ? <Snowflake className="h-16 w-16 text-[#4A5775]" aria-label="QR dinonaktifkan" /> : <div className="shimmer h-52 w-52 rounded-xl" aria-label="Memuat QR" />}
      </div>
      {error && !beku && (
        <p role="alert" className="mt-3 text-center text-sm text-amber">QR belum bisa dibuat: {error}</p>
      )}
      {/* Plat besar agar petugas bisa mencocokkan dengan kendaraan tanpa melihat NIM. */}
      <div className="mt-4 rounded-xl border-2 border-hi/70 px-4 py-1.5 font-mono text-2xl font-bold tracking-[0.15em]">{k.plat}</div>
      <p className="mt-1 text-xs text-mid">{k.merek} · {k.warna}</p>
      <div className="mt-3 w-56">
        <div className="h-1.5 overflow-hidden rounded-full bg-glass-strong">
          <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${code ? (left / period) * 100 : 0}%`, background: 'var(--grad-primary)' }} />
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-mid">
          {arah === 'masuk' ? <LogIn className="h-3.5 w-3.5 text-mint" /> : <LogOut className="h-3.5 w-3.5 text-amber" />}
          Untuk gerbang {arah} · berganti tiap {period} dtk
        </p>
      </div>
    </div>
  )
}

function KartuHasil({ h }: { h: HasilGerbang & { pemilik?: string } }) {
  return (
    <div role="status" className={`glass mt-3 flex items-start gap-3 border p-4 ${h.ok ? 'border-[color-mix(in_srgb,var(--mint)_45%,transparent)]' : 'border-[color-mix(in_srgb,var(--rose)_45%,transparent)]'}`}>
      {h.ok ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-mint" aria-hidden /> : <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose" aria-hidden />}
      <div className="min-w-0 text-sm">
        <p className="font-display text-base font-bold">{h.ok ? (h.arah === 'masuk' ? 'Palang terbuka · MASUK' : 'Palang terbuka · KELUAR') : 'Ditolak'}</p>
        <p className="text-mid">{h.ok ? h.pesan : h.alasan}</p>
        {h.kendaraan && (
          <p className="mt-1 text-xs text-low">
            {h.kendaraan.plat} · {h.kendaraan.merek} · {h.kendaraan.warna}
            {h.pemilik ? ` · ${h.pemilik}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

/** Mode demo: meniru pemindai gerbang agar alur masuk/keluar bisa dicoba tanpa perangkat petugas. */
function SimulasiGerbang({ d, k, selesai }: { d: RingkasanParkir; k: Kendaraan; selesai: () => void }) {
  const pilihan = d.area.filter((a) => a.jenis === k.jenis)
  const [areaId, setAreaId] = useState(d.sesiAktif?.areaId ?? pilihan[0]?.id ?? '')
  const [hasil, setHasil] = useState<HasilGerbang | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const arah = arahBerikutnya(d)
  const pindai = async (a: Arah) => {
    setSibuk(true)
    try {
      const t = await issueQr('PARKIR', k.id)
      setHasil(await pindaiGerbang(qrPayload(t), a, d.sesiAktif?.areaId ?? areaId))
      selesai()
    } catch (e) {
      setHasil({ ok: false, alasan: (e as Error).message })
    } finally {
      setSibuk(false)
    }
  }
  return (
    <div className="glass mt-3 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-low"><ScanLine className="h-4 w-4" /> Simulasi pemindai gerbang (demo)</p>
      {!d.sesiAktif && (
        <label className="mb-3 block text-sm">
          <span className="text-mid">Gerbang area</span>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="glass mt-1 block min-h-11 w-full !rounded-xl px-3 text-sm">
            {pilihan.map((a) => (
              <option key={a.id} value={a.id}>{a.kampus} · {a.nama}</option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button disabled={sibuk} onClick={() => pindai(arah)} className="btn-primary flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50">
          {arah === 'masuk' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />} Pindai di gerbang {arah}
        </button>
        <button disabled={sibuk} onClick={() => pindai(arah === 'masuk' ? 'keluar' : 'masuk')} className="glass flex min-h-11 items-center justify-center gap-2 !rounded-xl text-sm font-semibold disabled:opacity-50">
          Coba gerbang {arah === 'masuk' ? 'keluar' : 'masuk'}
        </button>
      </div>
      {hasil && <KartuHasil h={hasil} />}
    </div>
  )
}

function DaftarKendaraan({ d, reload }: { d: RingkasanParkir; reload: () => void }) {
  const [form, setForm] = useState(false)
  const [galat, setGalat] = useState('')
  const aksi = async (fn: () => Promise<unknown>) => {
    setGalat('')
    try {
      await fn()
      reload()
    } catch (e) {
      setGalat((e as Error).message)
    }
  }
  const penuh = d.kendaraan.filter((k) => k.status !== 'ditolak').length >= ATURAN.maksKendaraan
  return (
    <div className="space-y-3">
      {d.kendaraan.length === 0 && <div className="glass p-5 text-center text-sm text-mid">Belum ada kendaraan terdaftar.</div>}
      {d.kendaraan.map((k) => (
        <div key={k.id} className="glass flex flex-wrap items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-glass-strong text-cyan"><IkonJenis jenis={k.jenis} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-mono font-bold tracking-wider">{k.plat}</p>
            <p className="truncate text-xs text-mid">{ATURAN.jenis[k.jenis].label} · {k.merek} · {k.warna}{k.stnk ? ` · STNK: ${k.stnk.nama}` : ''}</p>
            {k.catatan && <p className="text-xs text-rose">{k.catatan}</p>}
          </div>
          <Badge tone={k.status === 'terverifikasi' ? 'green' : k.status === 'menunggu' ? 'amber' : 'red'}>
            {k.status === 'terverifikasi' ? 'Terverifikasi' : k.status === 'menunggu' ? 'Menunggu verifikasi' : 'Ditolak'}
          </Badge>
          <div className="flex w-full flex-wrap justify-end gap-2">
            {USE_DEMO && k.status === 'menunggu' && (
              <>
                <button onClick={() => aksi(() => demoVerifikasiKendaraan(k.id, true))} className="min-h-11 rounded-xl px-3 text-xs font-semibold text-mint hover:underline">Setujui (simulasi Sarpras)</button>
                <button onClick={() => aksi(() => demoVerifikasiKendaraan(k.id, false))} className="min-h-11 rounded-xl px-3 text-xs font-semibold text-rose hover:underline">Tolak (simulasi)</button>
              </>
            )}
            <button
              disabled={!bolehHapus(d, k.id)}
              title={bolehHapus(d, k.id) ? undefined : 'Kendaraan sedang parkir'}
              onClick={() => confirm(`Hapus ${k.plat} dari KTM?`) && aksi(() => hapusKendaraan(k.id))}
              className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-mid hover:text-rose disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Hapus
            </button>
          </div>
        </div>
      ))}
      {galat && <p role="alert" className="text-sm text-rose">{galat}</p>}
      {form ? (
        <FormKendaraan d={d} batal={() => setForm(false)} selesai={() => (setForm(false), reload())} />
      ) : (
        <button disabled={penuh} onClick={() => setForm(true)} className="glass flex min-h-12 w-full items-center justify-center gap-2 !rounded-2xl text-sm font-semibold text-cyan disabled:opacity-50">
          <Plus className="h-4 w-4" /> {penuh ? `Maksimal ${ATURAN.maksKendaraan} kendaraan` : 'Daftarkan kendaraan'}
        </button>
      )}
    </div>
  )
}

function FormKendaraan({ d, batal, selesai }: { d: RingkasanParkir; batal: () => void; selesai: () => void }) {
  const [plat, setPlat] = useState('')
  const [jenis, setJenis] = useState<JenisKendaraan>('motor')
  const [merek, setMerek] = useState('')
  const [warna, setWarna] = useState('')
  const [stnk, setStnk] = useState<File | null>(null)
  const [galat, setGalat] = useState('')
  const [kirim, setKirim] = useState(false)
  const platRapi = plat ? normalisasiPlat(plat) : null
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setKirim(true)
    setGalat('')
    try {
      await daftarKendaraan({ plat, jenis, merek, warna, stnk: stnk ? { nama: stnk.name, ukuran: stnk.size, tipe: stnk.type } : undefined })
      selesai()
    } catch (err) {
      setGalat((err as Error).message)
    } finally {
      setKirim(false)
    }
  }
  const input = 'glass mt-1 block min-h-11 w-full !rounded-xl px-3 text-sm'
  return (
    <form onSubmit={submit} className="glass space-y-3 p-4" aria-label="Daftarkan kendaraan">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis kendaraan">
        {(Object.keys(ATURAN.jenis) as JenisKendaraan[]).map((j) => (
          <button type="button" key={j} role="radio" aria-checked={jenis === j} onClick={() => setJenis(j)} className={`glass flex min-h-11 items-center justify-center gap-2 !rounded-xl text-sm font-semibold ${jenis === j ? 'ring-2 ring-[var(--primary)]' : ''}`}>
            <IkonJenis jenis={j} className="h-4 w-4" /> {ATURAN.jenis[j].label}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        <span className="text-mid">Plat nomor</span>
        <input value={plat} onChange={(e) => setPlat(e.target.value)} placeholder="B 1234 XYZ" autoCapitalize="characters" className={`${input} font-mono uppercase`} required maxLength={16} />
        {plat && <span className={`text-xs ${platRapi ? 'text-mint' : 'text-amber'}`}>{platRapi ? `Tercatat sebagai ${platRapi}` : 'Format belum dikenali'}</span>}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="text-mid">Merek/tipe</span>
          <input value={merek} onChange={(e) => setMerek(e.target.value)} placeholder="Honda Beat" className={input} required maxLength={40} />
        </label>
        <label className="block text-sm">
          <span className="text-mid">Warna</span>
          <input value={warna} onChange={(e) => setWarna(e.target.value)} placeholder="Hitam" className={input} required maxLength={20} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-mid">Foto/scan STNK (PDF/JPG/PNG, maks {Math.round(ATURAN.stnk.maksByte / 1024 / 1024)} MB)</span>
        <input type="file" accept={ATURAN.stnk.tipe.join(',')} onChange={(e) => setStnk(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm text-mid file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-glass-strong file:px-3 file:text-sm file:font-semibold file:text-hi" />
      </label>
      <p className="text-xs text-low">STNK dicek petugas Sarpras. QR parkir aktif setelah kendaraan terverifikasi. Terdaftar: {d.kendaraan.length}/{ATURAN.maksKendaraan}.</p>
      {galat && <p role="alert" className="text-sm text-rose">{galat}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={batal} className="glass min-h-11 !rounded-xl text-sm font-semibold">Batal</button>
        <button disabled={kirim} className="btn-primary min-h-11 rounded-xl text-sm font-semibold disabled:opacity-50">{kirim ? 'Mengirim…' : 'Kirim pendaftaran'}</button>
      </div>
    </form>
  )
}

function AreaList({ d }: { d: RingkasanParkir }) {
  const kampus = [...new Set(d.area.map((a) => a.kampus))]
  return (
    <div className="space-y-4">
      {kampus.map((nama) => (
        <div key={nama}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-low">{nama}</p>
          <div className="space-y-2">
            {d.area
              .filter((a) => a.kampus === nama)
              .map((a) => {
                const o = okupansi(a, ATURAN)
                const tone = o.tingkat === 'penuh' ? 'red' : o.tingkat === 'ramai' ? 'amber' : 'green'
                const warna = o.tingkat === 'penuh' ? 'var(--rose)' : o.tingkat === 'ramai' ? 'var(--amber)' : 'var(--mint)'
                return (
                  <div key={a.id} className="glass p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <IkonJenis jenis={a.jenis} className="h-4 w-4 text-cyan" />
                      <span className="flex-1 truncate text-sm font-semibold">{a.nama}</span>
                      <Badge tone={tone}>{o.tingkat === 'penuh' ? 'Penuh' : `${o.sisa.toLocaleString('id-ID')} slot kosong`}</Badge>
                    </div>
                    <Progress value={o.persen} color={warna} />
                    <p className="mt-1 text-xs text-low">{a.terisi.toLocaleString('id-ID')} / {a.kapasitas.toLocaleString('id-ID')} terisi ({o.persen}%)</p>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
      <p className="text-xs text-low">Keterisian dihitung dari pindaian gerbang. {USE_DEMO ? 'Angka contoh.' : ''}</p>
    </div>
  )
}

function Riwayat({ d }: { d: RingkasanParkir }) {
  if (!d.riwayat.length) return <div className="glass p-5 text-center text-sm text-mid">Belum ada riwayat parkir.</div>
  return (
    <ul className="glass divide-y divide-line overflow-hidden">
      {d.riwayat.map((s) => (
        <li key={s.id} className="flex items-center gap-3 px-4 py-3">
          <History className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{s.areaNama}</p>
            <p className="text-xs text-low">
              {tanggal(s.masuk)} · {jam(s.masuk)}–{s.keluar ? jam(s.keluar) : '…'} WIB · {s.plat}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">{s.keluar ? formatDurasi(durasiMenit(s.masuk, s.keluar)) : 'Berjalan'}</p>
            <p className="text-low">{rupiah(s.tarif)}</p>
            {s.menginap && <Badge tone="amber">Menginap</Badge>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function Aturan() {
  const tarif = Object.values(ATURAN.jenis).every((j) => j.tarifPerMasuk == null) ? 'Belum ditetapkan' : Object.values(ATURAN.jenis).map((j) => `${j.label} ${rupiah(j.tarifPerMasuk)}`).join(' · ')
  return (
    <Section title="Ketentuan parkir" action={ATURAN.contoh ? <Badge tone="amber">Contoh</Badge> : undefined}>
      <ul className="glass space-y-2 p-4 text-sm text-mid">
        <li className="flex gap-2"><Clock className="h-4 w-4 shrink-0 text-cyan" /> Gerbang masuk {ATURAN.jamOperasi.buka}–{ATURAN.jamOperasi.tutup} WIB. Keluar tetap bisa di luar jam itu.</li>
        <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-cyan" /> Satu KTM hanya bisa satu kendaraan di dalam. Keluar dengan kendaraan yang sama seperti saat masuk.</li>
        <li className="flex gap-2"><Car className="h-4 w-4 shrink-0 text-cyan" /> Maksimal {ATURAN.maksKendaraan} kendaraan per KTM, wajib STNK terverifikasi. Tarif: {tarif}.</li>
        <li className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-amber" /> Parkir lebih dari {ATURAN.batasInapJam} jam ditandai menginap dan dicek petugas saat keluar.</li>
      </ul>
    </Section>
  )
}

// — Petugas gerbang (TENDIK) —

function Petugas() {
  const [areaId, setAreaId] = useState(ATURAN.area[0].id)
  const [arah, setArah] = useState<Arah>('masuk')
  const [hasil, setHasil] = useState<(HasilGerbang & { pemilik?: string }) | null>(null)
  const [manual, setManual] = useState('')
  const [kamera, setKamera] = useState(false)
  const kirim = async (payload: string) => {
    try {
      setHasil(await pindaiGerbang(payload, arah, areaId))
    } catch (e) {
      setHasil({ ok: false, alasan: (e as Error).message })
    }
  }
  const contohDemo = async () => {
    const d = await getParkir()
    const k = d.kendaraan.find((x) => x.status === 'terverifikasi')
    if (!k) return setHasil({ ok: false, alasan: 'Akun demo belum punya kendaraan terverifikasi.' })
    try {
      await kirim(qrPayload(await issueQr('PARKIR', k.id)))
    } catch (e) {
      setHasil({ ok: false, alasan: (e as Error).message })
    }
  }
  return (
    <div className="space-y-4">
      <div className="glass space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-mid">Pos gerbang</span>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="glass mt-1 block min-h-11 w-full !rounded-xl px-3 text-sm">
            {ATURAN.area.map((a) => (
              <option key={a.id} value={a.id}>{a.kampus} · {a.nama}</option>
            ))}
          </select>
        </label>
        <Tabs
          value={arah}
          onChange={setArah}
          options={[
            ['masuk', <><LogIn className="h-4 w-4" /> Masuk</>],
            ['keluar', <><LogOut className="h-4 w-4" /> Keluar</>],
          ]}
        />
      </div>
      <Pemindai aktif={kamera} setAktif={setKamera} onHasil={kirim} />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (manual.trim()) kirim(manual.trim())
        }}
        className="glass flex gap-2 p-3"
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Tempel isi QR (pemindai USB)" aria-label="Isi QR parkir" className="min-h-11 flex-1 rounded-xl bg-transparent px-3 font-mono text-xs outline-none" />
        <button className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">Cek</button>
      </form>
      {USE_DEMO && (
        <button onClick={contohDemo} className="w-full text-xs text-low underline">Pakai QR kendaraan akun demo</button>
      )}
      {hasil && <KartuHasil h={hasil} />}
    </div>
  )
}

function Pemindai({ aktif, setAktif, onHasil }: { aktif: boolean; setAktif: (b: boolean) => void; onHasil: (payload: string) => Promise<void> }) {
  const video = useRef<HTMLVideoElement>(null)
  const [ditolak, setDitolak] = useState(false)
  const kirim = useRef(onHasil)
  kirim.current = onHasil

  useEffect(() => {
    if (!aktif) return
    let stream: MediaStream | undefined
    let raf = 0
    let stop = false
    let terakhir = ''
    type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
    const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stop || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        if (!BD) return
        const detector = new BD({ formats: ['qr_code'] })
        const tick = async () => {
          if (stop || !video.current) return
          const hit = (await detector.detect(video.current).catch(() => [])).find((c) => c.rawValue.startsWith('SUPERUNPAM:PARKIR:'))
          // Satu QR diproses sekali; jeda singkat agar palang tidak terbuka dua kali.
          if (hit && hit.rawValue !== terakhir) {
            terakhir = hit.rawValue
            await kirim.current(hit.rawValue)
            await new Promise((r) => setTimeout(r, 1500))
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setDitolak(true)
        setAktif(false)
      }
    })()
    return () => {
      stop = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [aktif]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glass p-4 text-center">
      {aktif ? (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
            <video ref={video} className="h-full w-full object-cover" playsInline muted />
            <div className="absolute inset-8 rounded-xl border-4 border-white/80" />
          </div>
          <button onClick={() => setAktif(false)} className="mt-3 min-h-11 text-sm font-semibold text-mid">Tutup kamera</button>
        </>
      ) : (
        <>
          <div className="flex justify-center"><Icon3D icon={ScanLine} from="#5CE1FF" to="#2D6BFF" size={60} /></div>
          <p className="mt-2 text-sm text-mid">{ditolak ? 'Izin kamera ditolak. Pakai pemindai USB atau tempel isi QR.' : 'Pindai QR parkir di HP pengendara.'}</p>
          <button onClick={() => setAktif(true)} className="btn-primary mt-3 min-h-11 w-full rounded-xl font-semibold">Buka kamera</button>
        </>
      )}
    </div>
  )
}
