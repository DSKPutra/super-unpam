import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CreditCard, MapPin, MoonStar, QrCode } from 'lucide-react'
import { featureById } from '../../data/features'
import { summarizeIpk } from '../../lib/academic'
import { getGrades } from '../../lib/api'
import { rupiah } from '../../lib/format'
import { CAMPUS_LOCATION, prayerTimes } from '../../lib/prayer'
import { useResource } from '../../lib/useResource'
import { Icon3D } from '../../components/Icon3D'
import { Sparkline } from '../../components/ui'
import type { WidgetProps } from './types'

// Widget berbentuk tile di kisi bento Beranda. Kelas col-span ditentukan di sini karena
// tiap tile tahu ukurannya; registry.ts mencatat ukuran yang sama untuk Galeri.

export function KtmTile({ t, user, go }: WidgetProps) {
  const ktm = featureById('ktm')
  return (
    <button onClick={() => go('ktm')} className="holo group relative col-span-2 overflow-hidden rounded-3xl p-5 text-left text-white shadow-[var(--glow)] md:row-span-2" style={{ background: 'linear-gradient(135deg,#1B3FD1 0%,#2D6BFF 45%,#00B8E6 100%)' }}>
      <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,.22),transparent)]" />
      <div className="relative flex items-start justify-between">
        <Icon3D icon={ktm.icon} from="#7FA6FF" to="#1B3FD1" size={48} />
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Siap dipindai</span>
      </div>
      <div className="relative mt-6 md:mt-16">
        <div className="text-xs uppercase tracking-[0.18em] text-white/75">{t.ktm}</div>
        <div className="font-display text-xl font-bold">{user.name}</div>
        <div className="font-mono text-sm text-white/85">{user.nim}</div>
      </div>
      <div className="relative mt-4 flex items-center gap-2 text-sm font-semibold">
        <QrCode className="h-4 w-4" /> Tampilkan QR <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </button>
  )
}

export function KelasSekarangTile({ t, go, data }: WidgetProps) {
  const presensi = featureById('presensi')
  const now = data.schedule.data?.[0]
  return (
    <button onClick={() => go('presensi')} className="glass glass-hover group col-span-2 flex items-center gap-4 p-4 text-left md:col-span-2">
      <Icon3D icon={presensi.icon} from={presensi.from} to={presensi.to} size={52} />
      {now ? (
        <div className="min-w-0 flex-1">
          <div className="text-xs text-mid">Kelas sekarang · {now.time}</div>
          <div className="truncate font-display text-lg font-semibold">{now.name}</div>
          <div className="flex items-center gap-1 text-xs text-low"><MapPin className="h-3 w-3" /> {now.room}</div>
        </div>
      ) : (
        <div className="min-w-0 flex-1" aria-busy={data.schedule.loading}>
          <div className="text-xs text-mid">Kelas sekarang</div>
          {data.schedule.loading ? <div className="shimmer mt-1 h-6 w-3/4 rounded-xl" /> : <div className="font-display text-lg font-semibold">Tidak ada kelas</div>}
        </div>
      )}
      <span className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">{t.checkIn}</span>
    </button>
  )
}

export function IpkTile({ t, go }: WidgetProps) {
  const res = useResource(getGrades)
  const { ipk, history, delta } = useMemo(() => summarizeIpk(res.data ?? []), [res.data])
  return (
    <button onClick={() => go('akademik/nilai')} className="glass glass-hover p-4 text-left">
      <div className="text-xs text-mid">{t.ipk}</div>
      <div className="font-display text-3xl font-bold">{ipk?.toFixed(2) ?? '—'}</div>
      {history.length >= 2 && <Sparkline data={history} />}
      {delta !== null && (
        <div className={`text-[11px] font-semibold ${delta >= 0 ? 'text-mint' : 'text-rose'}`}>
          {delta >= 0 ? '▲ naik' : '▼ turun'} {Math.abs(delta).toFixed(2)}
        </div>
      )}
    </button>
  )
}

export function TagihanTile({ t, go, data }: WidgetProps) {
  const unpaid = data.bills.data?.filter((b) => b.status === 'unpaid')
  // Data contoh menulis tahun lengkap; di tile cukup tanggal dan bulan.
  const due = unpaid?.[0]?.due.replace(/\s\d{4}$/, '')
  return (
    <button onClick={() => go('keuangan')} className="glass glass-hover p-4 text-left">
      <div className="flex items-center justify-between text-xs text-mid">
        {t.bills} <CreditCard className="h-4 w-4 text-rose" />
      </div>
      <div className="font-display text-3xl font-bold">{unpaid?.length ?? '—'}</div>
      <div className="mt-2 truncate text-xs text-mid">{unpaid ? rupiah(unpaid.reduce((a, b) => a + b.amount, 0)) : ' '}</div>
      {due && <div className="text-[11px] font-semibold text-rose">● jatuh tempo {due}</div>}
    </button>
  )
}

export function SholatTile({ t, go }: WidgetProps) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const day = now.toDateString()
  const times = useMemo(() => prayerTimes(new Date(day), CAMPUS_LOCATION.lat, CAMPUS_LOCATION.lng), [day])
  const next = Object.entries(times).find(([k, v]) => k !== 'Terbit' && v > now)
  const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return (
    <button onClick={() => go('islami')} className="glass glass-hover p-4 text-left">
      <div className="flex items-center justify-between text-xs text-mid">
        {t.prayer} <MoonStar className="h-4 w-4 text-mint" />
      </div>
      <div className="font-display text-3xl font-bold">{next ? fmt(next[1]) : fmt(times.Subuh)}</div>
      <div className="mt-2 truncate text-xs text-mid">{next ? next[0] : `Subuh ${t.tomorrow}`}</div>
      <div className="text-[11px] text-low">{CAMPUS_LOCATION.name}</div>
    </button>
  )
}
