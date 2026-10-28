import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { issueQr, QR_PERIOD, qrPayload } from '../lib/api'
import type { QrKind, QrToken, User } from '../lib/types'
import { Cpu, DoorOpen, Download, FileCheck2, Library, MapPin, RefreshCw, Share2, ShieldCheck, WifiOff } from 'lucide-react'
import { Icon3D } from '../components/Icon3D'
import { PageHeader, Section } from '../components/ui'

// QR berganti tiap 30 detik agar tidak bisa di-screenshot & dipakai ulang. Di mode BFF kode
// ditandatangani server (HMAC) dan divalidasi server; klien hanya menampilkan.
export function useDynamicQr(kind: QrKind, subject: string) {
  const [token, setToken] = useState<QrToken | null>(null)
  const [left, setLeft] = useState(-1) // -1 = belum ada token; 0 = kedaluwarsa → minta token baru
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    issueQr(kind, subject).then(
      (t) => {
        if (!alive) return
        setToken(t)
        setLeft(t.expiresIn)
        setError('')
      },
      (e: Error) => {
        if (!alive) return
        setError(e.message)
        setLeft(10) // coba lagi 10 detik kemudian
      },
    )
    return () => {
      alive = false
    }
  }, [kind, subject, attempt])

  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (left === 0) setAttempt((n) => n + 1)
  }, [left])

  useEffect(() => {
    if (!token) return
    QRCode.toDataURL(qrPayload(token), { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#0a3f83', light: '#ffffff' } }).then(setSrc)
  }, [token])

  // Kode kedaluwarsa tidak boleh terus tampil seolah masih berlaku.
  const valid = !!token && left > 0 && !error
  return { src: valid ? src : '', code: valid ? token.code : '', left: Math.max(left, 0), period: token?.period ?? QR_PERIOD, error }
}

export function KtmPage({ user, back }: { user: User; back: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const { src, code, left, period, error } = useDynamicQr('KTM', user.nim)
  const validUntil = `31 Agu ${Number(user.angkatan) + 4}`

  return (
    <div className="page-enter mx-auto max-w-md">
      <PageHeader title="KTM Digital" subtitle="Kartu hologram · ketuk untuk membalik" onBack={back} />

      <div className="[perspective:1200px]">
        <button
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? 'Tampilkan sisi depan KTM' : 'Tampilkan sisi belakang KTM'}
          className="relative block aspect-[1.586] w-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          {/* Depan — hologram */}
          <div
            className="holo absolute inset-0 overflow-hidden rounded-3xl p-5 text-left text-white shadow-[var(--glow)] [backface-visibility:hidden]"
            style={{ background: 'radial-gradient(120% 140% at 0% 0%, #4D86FF 0%, #1B3FD1 38%, #3B1FA8 72%, #00B8E6 120%)' }}
          >
            <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(0,212,255,.4),transparent)]" />
            <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(122,92,255,.5),transparent)]" />
            <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
              <defs>
                <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M22 0H0V22" fill="none" stroke="white" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
            <div className="relative flex items-center gap-2">
              <img src="/brand/unpam-logo-256.webp" alt="Logo UNPAM" width="36" height="36" className="h-9 w-9 rounded-full ring-2 ring-white/40" />
              <div className="leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">Kartu Tanda Mahasiswa</div>
                <div className="font-display text-xs font-bold text-[#FFD65C]">UNIVERSITAS PAMULANG</div>
              </div>
              <Cpu className="ml-auto h-8 w-8 text-[#FFD65C]/80" strokeWidth={1.5} />
            </div>
            <div className="relative mt-4 flex items-end gap-4">
              <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 font-display text-2xl font-bold">
                {user.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-base font-bold">{user.name}</div>
                <div className="font-mono text-sm tracking-wider">{user.nim}</div>
                <div className="truncate text-[11px] text-white/80">{user.prodi}</div>
                <div className="truncate text-[11px] text-white/80">{user.fakultas}</div>
              </div>
            </div>
            <div className="absolute bottom-3 left-5 right-5 flex justify-between text-[10px] text-white/75">
              <span>Berlaku s.d. {validUntil}</span>
              <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Ketuk untuk membalik</span>
            </div>
          </div>
          {/* Belakang */}
          <div className="absolute inset-0 flex items-center gap-4 rounded-3xl bg-white p-5 text-left text-[#0B1222] shadow-[var(--glow)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {src && <img src={src} alt={`QR KTM ${user.nim}`} className="h-full max-h-40 rounded-lg" />}
            <div className="text-xs">
              <div className="font-semibold">Kode verifikasi</div>
              <div className="font-mono text-lg font-bold tracking-widest text-[#1B4BE0]">{code}</div>
              <div className="mt-1 text-[#4A5775]">{code ? `Berganti dalam ${left} dtk` : 'Memuat kode…'}</div>
            </div>
          </div>
        </button>
      </div>

      <Section title="QR untuk scan">
        <div className="glass flex flex-col items-center p-5">
          <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-white p-2 shadow-[var(--glow)]">
            {src ? <img src={src} alt={`QR KTM dinamis ${user.nim}`} className="h-52 w-52" /> : <div className="shimmer h-52 w-52 rounded-xl" aria-label="Memuat QR" />}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-center text-sm text-amber">
              QR belum bisa dibuat: {error}
            </p>
          )}
          <div className="mt-4 font-mono text-xl font-bold tracking-[0.3em] text-gradient">{code || '\u00a0'}</div>
          <div className="mt-3 w-56">
            <div className="h-1.5 overflow-hidden rounded-full bg-glass-strong">
              <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${code ? (left / period) * 100 : 0}%`, background: 'var(--grad-primary)' }} />
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-mid"><ShieldCheck className="h-3.5 w-3.5 text-mint" /> QR berganti tiap {period} detik</p>
          </div>
        </div>
      </Section>

      <Section title="Dipakai untuk">
        <div className="glass grid grid-cols-4 gap-2 p-4">
          {USES.map(({ icon, from, to, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <Icon3D icon={icon} from={from} to={to} size={42} />
              <span className="text-[11px] text-mid">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => window.print()} className="glass glass-hover flex min-h-12 items-center justify-center gap-2 !rounded-2xl text-sm font-semibold">
          <Download className="h-4 w-4" /> Simpan / cetak
        </button>
        <button
          disabled={!code}
          onClick={() => navigator.share?.({ title: 'Verifikasi KTM', text: `Kode verifikasi KTM ${user.nim}: ${code}` })}
          className="btn-primary flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> Bagikan kode
        </button>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1 text-xs text-mid"><WifiOff className="h-3.5 w-3.5" /> KTM tetap bisa dibuka offline setelah aplikasi dipasang.</p>
    </div>
  )
}

const USES = [
  { icon: MapPin, from: '#FF7A93', to: '#E0245E', label: 'Presensi' },
  { icon: DoorOpen, from: '#4DF0E0', to: '#0B8F9F', label: 'Akses gedung' },
  { icon: Library, from: '#A58CFF', to: '#5B3FE0', label: 'Perpustakaan' },
  { icon: FileCheck2, from: '#5CE1FF', to: '#2D6BFF', label: 'Ujian & event' },
]
