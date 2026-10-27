import { useEffect, useRef, useState } from 'react'
import { schedule } from '../data/demo'
import type { User } from '../lib/types'
import { useDynamicQr } from './Ktm'
import { CheckCircle2, Hash, MapPin, ScanLine } from 'lucide-react'
import { Icon3D } from '../components/Icon3D'
import { Badge, DemoNote, PageHeader, Progress, Section, Tabs } from '../components/ui'

// TODO(LPTI): koordinat & radius resmi tiap kampus
const CAMPUSES = [
  { name: 'Kampus Pusat Pamulang', lat: -6.3437, lng: 106.739, radius: 300 },
  { name: 'Kampus Viktor', lat: -6.3478, lng: 106.6893, radius: 300 },
]

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

type Record_ = { course: string; time: string; method: string }
type Mode = 'qr' | 'gps' | 'kode'

const recap = [
  { name: 'Pemrograman Web', hadir: 7, total: 8 },
  { name: 'Basis Data Lanjut', hadir: 8, total: 8 },
  { name: 'Kecerdasan Buatan', hadir: 6, total: 8 },
  { name: 'Rekayasa Perangkat Lunak', hadir: 8, total: 8 },
  { name: 'Jaringan Komputer', hadir: 5, total: 8 },
]

export function Presensi({ user, back }: { user: User; back: () => void }) {
  return user.role === 'DOSEN' ? <PresensiDosen user={user} back={back} /> : <PresensiMahasiswa back={back} />
}

function PresensiMahasiswa({ back }: { back: () => void }) {
  const [mode, setMode] = useState<Mode>('qr')
  const [records, setRecords] = useState<Record_[]>([])
  const current = schedule[0]
  const done = records.find((r) => r.course === current.name)

  const checkIn = (method: string) =>
    setRecords((r) => [{ course: current.name, method, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }, ...r])

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Presensi Online" onBack={back} />
      <DemoNote />
      <div className="glass p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-mid">Sesi berlangsung</div>
            <div className="text-lg font-semibold">{current.name}</div>
            <div className="text-xs text-mid">{current.time} · {current.room} · {current.lecturer}</div>
          </div>
          {done ? <Badge tone="green">Hadir {done.time}</Badge> : <Badge tone="amber">Belum presensi</Badge>}
        </div>
      </div>

      {done ? (
        <div className="glass mt-4 p-6 text-center">
          <div className="flex justify-center"><Icon3D icon={CheckCircle2} from="#3DF5D5" to="#00A88C" size={72} label="Berhasil" /></div>
          <div className="mt-2 text-lg font-semibold">Presensi berhasil</div>
          <div className="text-sm text-mid">{done.method} · pukul {done.time}</div>
        </div>
      ) : (
        <div className="mt-4">
          <Tabs value={mode} onChange={setMode} options={[['qr', <><ScanLine className="h-4 w-4" /> Scan QR</>], ['gps', <><MapPin className="h-4 w-4" /> Lokasi</>], ['kode', <><Hash className="h-4 w-4" /> Kode</>]]} />
          {mode === 'qr' && <QrScan onSuccess={() => checkIn('Scan QR dosen')} />}
          {mode === 'gps' && <GpsCheck onSuccess={(c) => checkIn(`Lokasi · ${c}`)} />}
          {mode === 'kode' && <CodeEntry onSuccess={() => checkIn('Kode sesi')} />}
        </div>
      )}

      <Section title="Rekap kehadiran semester ini">
        <div className="glass divide-y divide-line">
          {recap.map((r) => {
            const pct = Math.round((r.hadir / r.total) * 100)
            return (
              <div key={r.name} className="p-4">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className={pct < 75 ? 'font-semibold text-rose' : 'text-mid'}>{r.hadir}/{r.total} · {pct}%</span>
                </div>
                <Progress value={pct} color={pct < 75 ? 'var(--rose)' : 'var(--mint)'} />
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-mid">Minimal kehadiran 75% untuk dapat mengikuti UAS.</p>
      </Section>
    </div>
  )
}

function QrScan({ onSuccess }: { onSuccess: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'idle' | 'scanning' | 'denied'>('idle')
  const done = useRef(onSuccess)
  done.current = onSuccess

  useEffect(() => {
    if (state !== 'scanning') return
    let stream: MediaStream | undefined
    let raf = 0
    let stopped = false
    type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
    const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        if (!BD) return
        const detector = new BD({ formats: ['qr_code'] })
        const tick = async () => {
          if (stopped || !video.current) return
          const codes = await detector.detect(video.current).catch(() => [])
          if (codes.some((c) => c.rawValue.startsWith('SUPERUNPAM:PRESENSI:'))) return done.current()
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        setState('denied')
      }
    })()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [state])

  return (
    <div className="glass p-5 text-center">
      {state === 'scanning' ? (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-black">
            <video ref={video} className="h-full w-full object-cover" playsInline muted />
            <div className="absolute inset-8 rounded-xl border-4 border-white/80" />
          </div>
          <p className="mt-3 text-sm text-mid">Arahkan kamera ke QR yang ditampilkan dosen.</p>
          <button onClick={onSuccess} className="mt-2 text-xs text-low underline">Simulasikan scan berhasil (demo)</button>
        </>
      ) : (
        <>
          <div className="flex justify-center"><Icon3D icon={ScanLine} from="#5CE1FF" to="#2D6BFF" size={72} /></div>
          <p className="mt-2 text-sm text-mid">
            {state === 'denied' ? 'Izin kamera ditolak. Aktifkan izin kamera, atau gunakan presensi lokasi/kode.' : 'Scan QR sesi yang ditampilkan dosen di kelas.'}
          </p>
          <button onClick={() => setState('scanning')} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white">
            Buka kamera
          </button>
        </>
      )}
    </div>
  )
}

function GpsCheck({ onSuccess }: { onSuccess: (campus: string) => void }) {
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [near, setNear] = useState<{ name: string; d: number } | null>(null)

  const locate = () => {
    if (!navigator.geolocation) return setMsg('Perangkat tidak mendukung lokasi.')
    setBusy(true)
    setMsg('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const best = CAMPUSES.map((c) => ({ name: c.name, d: distance(me, c), radius: c.radius })).sort((a, b) => a.d - b.d)[0]
        setNear(best)
        if (best.d <= best.radius) onSuccess(best.name)
        else setMsg(`Anda berada ±${(best.d / 1000).toFixed(1)} km dari ${best.name}. Presensi lokasi hanya bisa di area kampus.`)
      },
      () => {
        setBusy(false)
        setMsg('Izin lokasi ditolak atau lokasi tidak tersedia.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="glass p-5 text-center">
      <div className="flex justify-center"><Icon3D icon={MapPin} from="#FF7A93" to="#E0245E" size={72} /></div>
      <p className="mt-2 text-sm text-mid">Presensi otomatis bila Anda berada dalam radius area kampus.</p>
      <ul className="mt-3 space-y-1 text-xs text-mid">
        {CAMPUSES.map((c) => (
          <li key={c.name}>{c.name} · radius {c.radius} m</li>
        ))}
      </ul>
      <button onClick={locate} disabled={busy} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Mencari lokasi…' : 'Cek lokasi & presensi'}
      </button>
      {msg && <p className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] p-3 text-sm text-amber">{msg}</p>}
      {near && near.d > 300 && (
        <button onClick={() => onSuccess(CAMPUSES[0].name)} className="mt-2 text-xs text-low underline">Simulasikan berada di kampus (demo)</button>
      )}
    </div>
  )
}

function CodeEntry({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  return (
    <form
      className="glass p-5"
      onSubmit={(e) => {
        e.preventDefault()
        // TODO(BFF): validasi kode sesi di server
        if (/^[A-Z0-9]{6,7}$/.test(code)) onSuccess()
        else setErr('Kode tidak valid. Kode terdiri dari 6–7 huruf/angka.')
      }}
    >
      <label className="block text-sm font-medium" htmlFor="kode">Kode sesi dari dosen</label>
      <input
        id="kode"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
          setErr('')
        }}
        maxLength={7}
        inputMode="text"
        autoComplete="off"
        placeholder="mis. 7K2QX9A"
        className="mt-2 w-full rounded-xl border border-line bg-transparent p-3 text-center font-mono text-2xl tracking-[0.3em] uppercase"
      />
      {err && <p className="mt-2 text-sm text-rose">{err}</p>}
      <button className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white">Kirim presensi</button>
    </form>
  )
}

function PresensiDosen({ user, back }: { user: User; back: () => void }) {
  const [open, setOpen] = useState(false)
  const { src, code, left } = useDynamicQr({ ...user, nim: `SESI-${schedule[0].code}` }, 'PRESENSI')
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setCount((c) => Math.min(c + Math.ceil(Math.random() * 3), 34)), 2500)
    return () => clearInterval(id)
  }, [open])

  const current = schedule[0]
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Presensi Kelas (Dosen)" onBack={back} />
      <DemoNote />
      <div className="glass p-5">
        <div className="text-xs text-mid">Kelas</div>
        <div className="text-lg font-semibold">{current.name}</div>
        <div className="text-xs text-mid">{current.time} · {current.room}</div>
        {!open ? (
          <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white">
            Buka sesi presensi
          </button>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {src && <img src={src} alt="QR sesi presensi" className="h-64 w-64 rounded-xl" />}
            <div className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-cyan">{code}</div>
            <p className="text-xs text-mid">QR & kode berganti dalam {left} dtk (anti titip absen)</p>
            <div className="mt-4 text-3xl font-bold">{count} <span className="text-base font-normal text-mid">/ 34 hadir</span></div>
            <button onClick={() => setOpen(false)} className="mt-4 rounded-xl bg-rose px-6 py-2.5 font-semibold text-white">Tutup sesi</button>
          </div>
        )}
      </div>
    </div>
  )
}
