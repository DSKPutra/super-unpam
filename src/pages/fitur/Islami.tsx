import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, Compass, MapPin, Moon } from 'lucide-react'
import { CAMPUS_LOCATION, prayerTimes, qibla } from '../../lib/prayer'
import { DemoNote, PageHeader, Section } from '../../components/ui'

// #48 Pusat layanan Islami — jadwal sholat (hitung lokal), arah kiblat (kompas), kegiatan.
const KAMPUS = CAMPUS_LOCATION

const KEGIATAN = [
  { title: 'Kajian Jumat ba’da Dzuhur', place: 'Masjid Kampus', when: 'Setiap Jumat' },
  { title: 'Tahsin Al-Qur’an mahasiswa', place: 'Ruang C-101', when: 'Selasa, 16:00' },
]

export function Islami({ back }: { back: () => void }) {
  const [pos, setPos] = useState(KAMPUS)
  const [heading, setHeading] = useState<number | null>(null)
  const [now, setNow] = useState(new Date())
  const compass = useRef<EventListener | null>(null)
  const times = useMemo(() => prayerTimes(now, pos.lat, pos.lng), [now.toDateString(), pos]) // eslint-disable-line react-hooks/exhaustive-deps
  const q = qibla(pos.lat, pos.lng)
  const next = Object.entries(times).find(([k, t]) => k !== 'Terbit' && t > now)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => {
      clearInterval(id)
      if (compass.current) {
        window.removeEventListener('deviceorientationabsolute', compass.current)
        window.removeEventListener('deviceorientation', compass.current)
      }
    }
  }, [])

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, name: 'Lokasi Anda' }))

  const startCompass = async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    if (DOE.requestPermission && (await DOE.requestPermission()) !== 'granted') return
    const on = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = e.webkitCompassHeading ?? (e.absolute && e.alpha !== null ? 360 - e.alpha : null)
      if (h !== null) setHeading(h)
    }
    compass.current = on as EventListener
    window.addEventListener('deviceorientationabsolute', compass.current)
    window.addEventListener('deviceorientation', compass.current)
  }

  const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const arrow = heading === null ? q : q - heading

  return (
    <div>
      <PageHeader title="Layanan Islami" subtitle="Jadwal sholat & arah kiblat" onBack={back} />
      <DemoNote />
      <div className="glass p-5">
        <div className="flex items-center justify-between text-sm text-mid">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {pos.name}</span>
          <button onClick={useMyLocation} className="min-h-10 px-2 font-semibold text-cyan">Pakai lokasi saya</button>
        </div>
        {next && (
          <div className="mt-2">
            <div className="text-xs text-mid">Berikutnya</div>
            <div className="font-display text-3xl font-bold">
              {next[0]} <span className="text-gradient">{fmt(next[1])}</span>
            </div>
          </div>
        )}
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(times).map(([k, t]) => (
            <li key={k} className={`rounded-2xl p-3 text-center ${next?.[0] === k ? 'btn-primary' : 'bg-glass-strong'}`}>
              <div className="text-[11px] font-semibold opacity-80">{k}</div>
              <div className="font-mono text-base font-bold">{fmt(t)}</div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-low">Perkiraan hitungan lokal (parameter Kemenag RI: Subuh 20°, Isya 18°, ihtiyath 2 menit). Cocokkan dengan jadwal resmi masjid.</p>
      </div>

      <Section title="Arah kiblat">
        <div className="glass flex flex-col items-center p-6">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-line bg-glass-strong">
            {['U', 'T', 'S', 'B'].map((c, i) => (
              <span key={c} className="absolute text-xs font-bold text-mid" style={{ transform: `rotate(${i * 90}deg) translateY(-82px) rotate(${-i * 90}deg)` }}>
                {c}
              </span>
            ))}
            <div className="absolute h-40 w-1.5 transition-transform duration-500" style={{ transform: `rotate(${arrow}deg)` }}>
              <div className="h-1/2 rounded-full" style={{ background: 'var(--grad-primary)', boxShadow: 'var(--glow)' }} />
            </div>
            <Moon className="relative h-6 w-6 text-amber" />
          </div>
          <div className="mt-4 font-display text-2xl font-bold">{q.toFixed(0)}°</div>
          <div className="text-xs text-mid">dari utara, searah jarum jam</div>
          {heading === null && (
            <button onClick={startCompass} className="btn-primary mt-4 flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold">
              <Compass className="h-4 w-4" /> Aktifkan kompas
            </button>
          )}
        </div>
      </Section>

      <Section title="Kegiatan keagamaan">
        <ul className="glass divide-y divide-line">
          {KEGIATAN.map((k) => (
            <li key={k.title} className="flex items-center gap-3 px-4 py-3">
              <BellRing className="h-5 w-5 text-mint" />
              <div>
                <div className="text-sm font-semibold">{k.title}</div>
                <div className="text-xs text-low">{k.place} · {k.when}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
