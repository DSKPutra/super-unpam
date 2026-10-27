import { useState } from 'react'
import { Gift, IdCard, LayoutGrid, MapPin, Share2 } from 'lucide-react'

// #50 Onboarding tour (sekali jalan, bisa dilewati) + ajak teman (referral).
const STEPS = [
  { Icon: LayoutGrid, title: 'Semua layanan di satu tempat', text: 'Jadwal, KRS, nilai, kuliah online, pembayaran, sampai surat: semuanya dibuka di dalam Super UNPAM.' },
  { Icon: IdCard, title: 'KTM digital di tombol tengah', text: 'QR berganti tiap 30 detik, bisa dipakai untuk presensi, perpustakaan, dan akses gedung, bahkan saat offline.' },
  { Icon: MapPin, title: 'Presensi dari HP', text: 'Scan QR dosen, presensi lokasi di area kampus, atau masukkan kode sesi.' },
  { Icon: Gift, title: 'Ajak temanmu', text: 'Bagikan Super UNPAM ke teman sekelas supaya semua dapat info kampus lebih cepat.' },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const s = STEPS[i]
  const last = i === STEPS.length - 1
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-label="Panduan pengguna baru">
      <div key={i} className="glass page-enter w-full max-w-sm !rounded-[28px] !bg-surface p-6">
        <span className="btn-primary flex h-14 w-14 items-center justify-center rounded-2xl">
          <s.Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold">{s.title}</h2>
        <p className="mt-2 text-sm text-mid">{s.text}</p>
        <div className="mt-5 flex gap-1.5" aria-hidden>
          {STEPS.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-cyan' : 'w-1.5 bg-glass-strong'}`} />
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={onDone} className="min-h-11 px-2 text-sm font-semibold text-mid">Lewati</button>
          {last && (
            <button
              onClick={() => navigator.share?.({ title: 'Super UNPAM', text: 'Semua layanan kampus UNPAM dalam satu aplikasi.', url: location.origin })}
              className="ml-auto flex min-h-11 items-center gap-1.5 rounded-2xl bg-glass-strong px-4 text-sm font-semibold"
            >
              <Share2 className="h-4 w-4" /> Bagikan
            </button>
          )}
          <button onClick={() => (last ? onDone() : setI(i + 1))} className={`btn-primary min-h-11 rounded-2xl px-5 text-sm font-semibold ${last ? '' : 'ml-auto'}`}>
            {last ? 'Mulai' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  )
}
