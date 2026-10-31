import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileDown, ShieldCheck, Upload } from 'lucide-react'
import type { AturanProdi } from '../../data/aturan-akademik'
import { sha256Hex } from '../../lib/akademik/logbook'
import { fase, offsetServer, type BerkasJawaban, type Fase, type KirimanJawaban, type SesiDaring } from '../../lib/akademik/ujian-daring'
import { bacaBerkas } from '../../lib/berkas'
import { sumber } from '../../lib/sumber'
import type { DataDaring } from '../../lib/sumber/ujian'
import { Badge, Section, Skeleton } from '../../components/ui'

// T09 Ujian daring bentuk unggah jawaban. Jam resmi dari server (offset dihitung saat memuat); hitung
// mundur hanya tampilan. Kirim ulang memakai kunci yang sama sehingga tidak menggandakan kiriman.
// Tidak ada akses kamera/layar/mikrofon.

const zona = { timeZone: 'Asia/Jakarta' } as const
const jam = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', ...zona }).format(new Date(iso))
const durasi = (ms: number) => {
  const d = Math.max(0, Math.floor(ms / 1000))
  const j = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60
  return j ? `${j} j ${m} m` : `${m} m ${String(s).padStart(2, '0')} d`
}
const LABEL: Record<Fase, { teks: string; tone: 'slate' | 'green' | 'amber' | 'red' }> = {
  BELUM: { teks: 'Belum dimulai', tone: 'slate' },
  BERLANGSUNG: { teks: 'Berlangsung', tone: 'green' },
  TOLERANSI: { teks: 'Waktu habis — toleransi sambungan', tone: 'amber' },
  DITUTUP: { teks: 'Ditutup', tone: 'red' },
}
const kunciBaru = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export function UjianDaring({ aturan }: { aturan: AturanProdi }) {
  const [data, setData] = useState<{ d: DataDaring; offset: number; contoh: boolean } | null>(null)
  const [galat, setGalat] = useState('')
  const [, setDetak] = useState(0)
  const muat = useCallback(async () => {
    try {
      const sebelum = Date.now()
      const r = await sumber.ujian.daring()
      setData({ d: r.data, offset: offsetServer(r.data.serverNow, sebelum, Date.now()), contoh: r.asal === 'contoh' })
    } catch (e) {
      setGalat((e as Error).message)
    }
  }, [])
  useEffect(() => void muat(), [muat])
  useEffect(() => {
    const t = setInterval(() => setDetak((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (galat) return null // 404 = kampus tidak menyelenggarakan ujian daring
  if (!data) return <Section title="Ujian daring"><Skeleton rows={1} /></Section>
  if (!data.d.aktif || data.d.sesi.length === 0) return null
  const sekarang = Date.now() + data.offset
  return (
    <Section title="Ujian daring">
      {data.contoh && (
        <p className="glass mb-3 p-3 text-sm text-mid" role="note">
          Peragaan dengan data contoh. Kampus belum memutuskan penyelenggaraan ujian daring{aturan.ujianDaring.sumber === null && '; aturan waktu dan berkas masih contoh'}.
        </p>
      )}
      <p className="mb-3 flex items-start gap-2 text-sm text-mid">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden />
        Tidak ada perekaman kamera, layar, atau mikrofon. Waktu mengikuti jam server kampus. Nilai tampil setelah dirilis resmi.
      </p>
      <ul className="space-y-3">
        {data.d.sesi.map((s) => <KartuDaring key={s.id} s={s} sekarang={sekarang} aturan={aturan} onTerkirim={muat} />)}
      </ul>
    </Section>
  )
}

function KartuDaring({ s, sekarang, aturan, onTerkirim }: { s: SesiDaring & { kiriman: KirimanJawaban[] }; sekarang: number; aturan: AturanProdi; onTerkirim: () => void }) {
  const f = fase(s, sekarang, aturan)
  const [tertunda, setTertunda] = useState<BerkasJawaban | null>(null)
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const bolehKirim = f.fase === 'BERLANGSUNG' || f.fase === 'TOLERANSI'
  const menitTersisa = Math.ceil(f.sisaMs / 60_000)
  const terakhir = s.kiriman.at(-1)

  const kirim = async (b: BerkasJawaban) => {
    setProses(true)
    setPesan('')
    try {
      const r = await sumber.ujian.kirimJawaban(s.id, b)
      setTertunda(null)
      setPesan(r.data.baru ? `Jawaban versi ${r.data.kiriman.versi} diterima server pukul ${jam(r.data.kiriman.diterima)}.` : 'Jawaban ini sudah diterima sebelumnya; tidak dikirim dua kali.')
      if (input.current) input.current.value = ''
      onTerkirim()
    } catch (e) {
      // Berkas & kunci disimpan: "Kirim ulang" memakai kunci yang sama sehingga aman bila server sebenarnya sudah menerima.
      setTertunda(b)
      setPesan(`Gagal mengirim: ${(e as Error).message}`)
    } finally {
      setProses(false)
    }
  }
  const pilih = async (file: File | undefined) => {
    if (!file) return
    setPesan('')
    try {
      await kirim({ kunci: kunciBaru(), nama: file.name, ukuran: file.size, tipe: file.type, sha256: await sha256Hex(await bacaBerkas(file)) })
    } catch (e) {
      setPesan((e as Error).message)
    }
  }

  return (
    <li className="glass p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{s.namaMK} · {s.jenis}</h3>
        <Badge tone={LABEL[f.fase].tone}>{LABEL[f.fase].teks}</Badge>
      </div>
      <p className="text-mid">{jam(s.mulai)} – {jam(s.selesai)}{s.perpanjanganMenit > 0 && ` · perpanjangan ${s.perpanjanganMenit} menit`}</p>
      {f.fase !== 'DITUTUP' && (
        <p className="mt-1 font-semibold" aria-hidden>{f.fase === 'BELUM' ? 'Mulai dalam' : 'Sisa waktu'} {durasi(f.sisaMs)}</p>
      )}
      {/* Pembaca layar: diumumkan per menit, bukan per detik */}
      <p className="sr-only" aria-live="polite">{f.fase === 'DITUTUP' ? 'Ujian ditutup.' : `${f.fase === 'BELUM' ? 'Mulai dalam' : 'Sisa waktu'} ${menitTersisa} menit.`}</p>
      {s.soal ? (
        <a href={s.soal.url} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 font-semibold"><FileDown className="h-4 w-4" aria-hidden /> {s.soal.nama}</a>
      ) : (
        f.fase === 'BELUM' && <p className="mt-2 text-low">Soal dirilis server saat ujian dimulai.</p>
      )}
      {bolehKirim && (
        <label className="mt-3 block font-semibold">
          <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" aria-hidden /> Unggah jawaban ({aturan.ujianDaring.tipe.map((t) => t.split('/')[1].toUpperCase()).join('/')}, maks {aturan.ujianDaring.maksMB} MB)</span>
          <input ref={input} type="file" disabled={proses} accept={aturan.ujianDaring.tipe.join(',')} onChange={(e) => pilih(e.target.files?.[0])} className="mt-1.5 block w-full min-h-11 text-sm" />
        </label>
      )}
      {tertunda && (
        <button disabled={proses} onClick={() => kirim(tertunda)} className="btn-primary mt-2 min-h-11 rounded-xl px-4 font-semibold">Kirim ulang (tidak dobel)</button>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-mid">{pesan}</p>
      {terakhir && (
        <div className="mt-1 rounded-xl border border-line p-3">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-mint" aria-hidden /> Struk kiriman terakhir (versi {terakhir.versi} dari {s.kiriman.length})</p>
          <p className="mt-1 break-all text-xs text-mid">{terakhir.nama} · diterima {jam(terakhir.diterima)} (jam server) · SHA-256 {terakhir.sha256}</p>
          <p className="mt-1 text-xs text-low">Berkas belum disimpan di server penyimpanan kampus; yang dicatat baru sidik SHA-256 (contoh).</p>
        </div>
      )}
    </li>
  )
}
