import { useEffect, useRef, useState } from 'react'
import { checkIn, getAttendanceRecap, getCampusAreas, getSchedule, USE_DEMO } from '../lib/api'
import { useResource } from '../lib/useResource'
import type { CheckInRequest, CheckInResult, ScheduleItem, User } from '../lib/types'
import { useDynamicQr } from './Ktm'
import { CheckCircle2, Hash, MapPin, ScanLine } from 'lucide-react'
import { Icon3D } from '../components/Icon3D'
import { Async, Badge, DemoNote, PageHeader, Progress, Section, Skeleton, Tabs } from '../components/ui'

// Validasi QR, kode sesi, dan geofence dilakukan BFF (api/presensi). Koordinat kampus resmi
// hanya ada di konfigurasi server; klien menerima nama & radius area saja.

type Mode = 'qr' | 'gps' | 'kode'
type Submit = (input: CheckInRequest) => Promise<void>

export function Presensi({ user, back }: { user: User; back: () => void }) {
  const res = useResource(getSchedule)
  const title = user.role === 'DOSEN' ? 'Presensi Kelas (Dosen)' : 'Presensi Online'
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={title} onBack={back} />
      <DemoNote />
      <Async res={res}>
        {(schedule) =>
          !schedule[0] ? (
            <div className="glass p-5 text-sm text-mid">Tidak ada sesi kuliah yang bisa dipresensi saat ini.</div>
          ) : user.role === 'DOSEN' ? (
            <PresensiDosen current={schedule[0]} />
          ) : (
            <PresensiMahasiswa current={schedule[0]} />
          )
        }
      </Async>
    </div>
  )
}

function PresensiMahasiswa({ current }: { current: ScheduleItem }) {
  const [mode, setMode] = useState<Mode>('qr')
  const [records, setRecords] = useState<CheckInResult[]>([])
  const recap = useResource(getAttendanceRecap)
  const done = records.find((r) => r.course === current.name)

  const submit: Submit = async (input) => {
    const r = await checkIn(input, current.name)
    setRecords((rs) => [r, ...rs])
  }
  // Mode demo: tombol simulasi mencatat hadir tanpa melewati validasi.
  const simulate = (method: string) =>
    setRecords((rs) => [{ course: current.name, method, time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }, ...rs])

  return (
    <>
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
          {mode === 'qr' && <QrScan submit={submit} simulate={() => simulate('Scan QR dosen')} />}
          {mode === 'gps' && <GpsCheck submit={submit} simulate={simulate} />}
          {mode === 'kode' && <CodeEntry submit={submit} course={current.code} />}
        </div>
      )}

      <Section title="Rekap kehadiran semester ini">
        <Async res={recap}>
          {(rows) => (
            <div className="glass divide-y divide-line">
              {rows.map((r) => {
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
          )}
        </Async>
        <p className="mt-2 text-xs text-mid">Minimal kehadiran 75% untuk dapat mengikuti UAS.</p>
      </Section>
    </>
  )
}

function QrScan({ submit, simulate }: { submit: Submit; simulate: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<'idle' | 'scanning' | 'denied'>('idle')
  const [err, setErr] = useState('')
  const send = useRef(submit)
  send.current = submit

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
          const hit = codes.find((c) => c.rawValue.startsWith('SUPERUNPAM:PRESENSI:'))
          if (hit) {
            try {
              return await send.current({ method: 'qr', payload: hit.rawValue })
            } catch (e) {
              setErr((e as Error).message)
              await new Promise((r) => setTimeout(r, 1500)) // jeda sebelum memindai ulang
            }
          }
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
          {err && <p role="alert" className="mt-2 text-sm text-rose">{err}</p>}
          {USE_DEMO && <button onClick={simulate} className="mt-2 text-xs text-low underline">Simulasikan scan berhasil (demo)</button>}
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

function GpsCheck({ submit, simulate }: { submit: Submit; simulate: (method: string) => void }) {
  const areas = useResource(getCampusAreas)
  const [msg, setMsg] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [outside, setOutside] = useState(false)

  const locate = () => {
    if (!navigator.geolocation) return setMsg('Perangkat tidak mendukung lokasi.')
    setBusy(true)
    setMsg('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await submit({ method: 'gps', lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        } catch (e) {
          setOutside(true)
          setMsg((e as Error).message)
        } finally {
          setBusy(false)
        }
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
        {areas.data?.map((c) => (
          <li key={c.name}>{c.name} · radius {c.radius} m</li>
        ))}
      </ul>
      <button onClick={locate} disabled={busy} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Mencari lokasi…' : 'Cek lokasi & presensi'}
      </button>
      {msg && <p role="alert" className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] p-3 text-sm text-amber">{msg}</p>}
      {USE_DEMO && outside && areas.data?.[0] && (
        <button onClick={() => simulate(`Lokasi · ${areas.data![0].name}`)} className="mt-2 text-xs text-low underline">Simulasikan berada di kampus (demo)</button>
      )}
    </div>
  )
}

function CodeEntry({ submit, course }: { submit: Submit; course: string }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="glass p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await submit({ method: 'kode', course, code })
        } catch (x) {
          setErr((x as Error).message)
        } finally {
          setBusy(false)
        }
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
      {err && <p role="alert" className="mt-2 text-sm text-rose">{err}</p>}
      <button disabled={busy} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Memeriksa…' : 'Kirim presensi'}
      </button>
    </form>
  )
}

function PresensiDosen({ current }: { current: ScheduleItem }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  // TODO(BFF): jumlah hadir dari server (SSE/polling); saat ini simulasi.
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setCount((c) => Math.min(c + Math.ceil(Math.random() * 3), 34)), 2500)
    return () => clearInterval(id)
  }, [open])

  return (
    <div className="glass p-5">
      <div className="text-xs text-mid">Kelas</div>
      <div className="text-lg font-semibold">{current.name}</div>
      <div className="text-xs text-mid">{current.time} · {current.room}</div>
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white">
          Buka sesi presensi
        </button>
      ) : (
        <SessionQr course={current.code} count={count} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

function SessionQr({ course, count, onClose }: { course: string; count: number; onClose: () => void }) {
  const { src, code, left, error } = useDynamicQr('PRESENSI', `SESI-${course}`)
  return (
    <div className="mt-4 flex flex-col items-center">
      {src ? <img src={src} alt="QR sesi presensi" className="h-64 w-64 rounded-xl" /> : error ? <Skeleton rows={1} /> : <div className="shimmer h-64 w-64 rounded-xl" aria-label="Memuat QR" />}
      {error && <p role="alert" className="mt-2 text-sm text-amber">QR belum bisa dibuat: {error}</p>}
      <div className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-cyan">{code || ' '}</div>
      <p className="text-xs text-mid">QR & kode berganti dalam {left} dtk (anti titip absen)</p>
      <div className="mt-4 text-3xl font-bold">{count} <span className="text-base font-normal text-mid">/ 34 hadir</span></div>
      <button onClick={onClose} className="mt-4 rounded-xl bg-rose px-6 py-2.5 font-semibold text-white">Tutup sesi</button>
    </div>
  )
}
