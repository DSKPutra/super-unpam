import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { User } from '../lib/types'
import { PageHeader, Section } from '../components/ui'

const PERIOD = 30 // detik — QR berganti agar tidak bisa di-screenshot & dipakai ulang

// TODO(BFF): token ditandatangani server (JWT/HMAC berumur pendek). Ini hanya simulasi di sisi klien.
function token(user: User, slot: number) {
  let h = 0
  for (const ch of `${user.nim}|${slot}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h.toString(36).toUpperCase().padStart(7, '0').slice(-7)
}

export function useDynamicQr(user: User, kind: 'KTM' | 'PRESENSI' = 'KTM') {
  const [now, setNow] = useState(() => Date.now())
  const [src, setSrc] = useState('')
  const slot = Math.floor(now / 1000 / PERIOD)
  const left = PERIOD - (Math.floor(now / 1000) % PERIOD)
  const code = token(user, slot)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const payload = `SUPERUNPAM:${kind}:${user.nim}:${slot}:${code}`
    QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#0a3f83', light: '#ffffff' } }).then(setSrc)
  }, [user.nim, slot, code, kind])

  return { src, code, left }
}

export function KtmPage({ user, back }: { user: User; back: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const { src, code, left } = useDynamicQr(user)
  const validUntil = `31 Agu ${Number(user.angkatan) + 4}`

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="KTM Digital" onBack={back} />

      <div className="[perspective:1200px]">
        <button
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? 'Tampilkan sisi depan KTM' : 'Tampilkan sisi belakang KTM'}
          className="relative block aspect-[1.586] w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'none' }}
        >
          {/* Depan */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-unpam-500 via-unpam-600 to-unpam-700 p-5 text-left text-white shadow-xl [backface-visibility:hidden]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-unpam-gold/20" />
            <div className="flex items-center gap-2">
              <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
              <div className="leading-tight">
                <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Kartu Tanda Mahasiswa</div>
                <div className="text-xs font-bold text-unpam-gold">UNIVERSITAS PAMULANG</div>
              </div>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-white/20 text-3xl font-bold">
                {user.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-bold">{user.name}</div>
                <div className="font-mono text-sm tracking-wider">{user.nim}</div>
                <div className="truncate text-[11px] opacity-85">{user.prodi}</div>
                <div className="truncate text-[11px] opacity-85">{user.fakultas}</div>
              </div>
            </div>
            <div className="absolute bottom-3 left-5 right-5 flex justify-between text-[10px] opacity-80">
              <span>Berlaku s.d. {validUntil}</span>
              <span>Ketuk untuk membalik ↻</span>
            </div>
          </div>
          {/* Belakang */}
          <div className="absolute inset-0 flex items-center gap-4 rounded-2xl bg-white p-5 text-left text-slate-900 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {src && <img src={src} alt={`QR KTM ${user.nim}`} className="h-full max-h-40 rounded-lg" />}
            <div className="text-xs">
              <div className="font-semibold">Kode verifikasi</div>
              <div className="font-mono text-lg font-bold tracking-widest text-unpam-700">{code}</div>
              <div className="mt-1 text-slate-500">Berganti dalam {left} dtk</div>
            </div>
          </div>
        </button>
      </div>

      <Section title="QR untuk scan">
        <div className="card flex flex-col items-center p-5">
          {src && <img src={src} alt={`QR KTM dinamis ${user.nim}`} className="h-56 w-56 rounded-xl" />}
          <div className="mt-3 font-mono text-xl font-bold tracking-[0.3em] text-unpam-700 dark:text-unpam-100">{code}</div>
          <div className="mt-2 w-56">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-unpam-500 transition-all duration-1000 ease-linear" style={{ width: `${(left / PERIOD) * 100}%` }} />
            </div>
            <p className="mt-1 text-center text-xs text-slate-500">QR diperbarui otomatis tiap {PERIOD} detik</p>
          </div>
        </div>
      </Section>

      <Section title="Dipakai untuk">
        <div className="card grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          {[['📍', 'Presensi kelas'], ['🚪', 'Akses gedung & lab'], ['📚', 'Perpustakaan'], ['📝', 'Ujian & event']].map(([i, l]) => (
            <div key={l} className="flex flex-col items-center gap-1 text-center">
              <span className="text-2xl" aria-hidden>{i}</span>
              <span className="text-xs">{l}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => window.print()} className="rounded-xl border border-unpam-600 py-3 text-sm font-semibold text-unpam-600 dark:text-unpam-100">⬇️ Simpan / cetak</button>
        <button
          onClick={() => navigator.share?.({ title: 'Verifikasi KTM', text: `Kode verifikasi KTM ${user.nim}: ${code}` })}
          className="rounded-xl bg-unpam-600 py-3 text-sm font-semibold text-white"
        >
          ↗ Bagikan kode
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">✓ KTM tersedia offline setelah aplikasi dipasang.</p>
    </div>
  )
}
