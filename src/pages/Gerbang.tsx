import { useEffect } from 'react'
import { BatteryWarning, CreditCard, Sun, Timer } from 'lucide-react'
import { USE_DEMO } from '../lib/api'
import type { User } from '../lib/types'
import { PageHeader, Section } from '../components/ui'
import { useDynamicQr } from './Ktm'

// QR gerbang keluar: QR dinamis bertanda tangan server (berganti 30 detik, sekali pakai di validator
// gerbang) untuk menggantikan tap kartu yang lambat. Layar dijaga tetap menyala selama halaman terbuka.
// Kartu NFC tetap berlaku di pembaca hibrida bila HP mati. Analisis: docs/Analisis-Gerbang-Keluar-Super-UNPAM.pptx

export function GerbangPage({ user, back }: { user: User; back: () => void }) {
  const { src, code, left, period, error } = useDynamicQr('GERBANG', user.nim)

  useEffect(() => {
    let kunci: { release(): Promise<void> } | undefined
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
    nav.wakeLock?.request('screen').then((k) => (kunci = k), () => {})
    return () => void kunci?.release().catch(() => {})
  }, [])

  return (
    <div>
      <PageHeader title="QR Gerbang Keluar" subtitle="Tunjukkan ke pembaca di palang" onBack={back} />
      {USE_DEMO && <p className="mb-3 text-xs text-low">Mode demo: kode dibuat di perangkat dan tidak diterima gerbang sungguhan.</p>}
      {/* Latar putih penuh di sekitar QR: kontras maksimal agar pembaca cepat menangkap layar HP. */}
      <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
        {src ? <img src={src} alt={`QR gerbang keluar ${user.nim}`} className="h-64 w-64" /> : <div className="shimmer h-64 w-64 rounded-xl" aria-label="Memuat QR" />}
        <p className="mt-2 font-mono text-lg font-bold tracking-widest">{code || '·······'}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <div className="h-full rounded-full bg-[#0a3f83] transition-all duration-1000 ease-linear" style={{ width: `${code ? (left / period) * 100 : 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-600" role="status">{error ? `Gagal memuat QR: ${error}` : code ? `Berganti dalam ${left} detik · sekali pakai` : 'Memuat…'}</p>
      </div>
      <Section title="Supaya cepat lewat">
        <ul className="glass space-y-3 p-4 text-sm">
          <li className="flex gap-3"><Timer className="h-5 w-5 shrink-0 text-cyan" aria-hidden />Buka halaman ini sebelum sampai di palang. Pintasan "QR Gerbang" ada di Beranda.</li>
          <li className="flex gap-3"><Sun className="h-5 w-5 shrink-0 text-amber" aria-hidden />Naikkan kecerahan layar dan arahkan ke pembaca dari jarak ±10–20 cm.</li>
          <li className="flex gap-3"><CreditCard className="h-5 w-5 shrink-0 text-mint" aria-hidden />HP mati atau tertinggal? Kartu mahasiswa tetap bisa ditempel di pembaca yang sama.</li>
          <li className="flex gap-3"><BatteryWarning className="h-5 w-5 shrink-0 text-rose" aria-hidden />Tangkapan layar tidak berlaku: kode berganti tiap 30 detik dan hanya bisa membuka palang sekali.</li>
        </ul>
      </Section>
    </div>
  )
}
