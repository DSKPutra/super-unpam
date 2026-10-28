import { useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CalendarPlus, CheckCircle2, Circle, ShieldAlert, Upload, XCircle } from 'lucide-react'
import { aturanContoh } from '../lib/akademik/aturan'
import { ringkasKelayakan } from '../lib/akademik/kelayakan'
import { indeksLangkah, LABEL_STATUS, URUTAN_STATUS } from '../lib/akademik/alur-skripsi'
import type { AturanAkademik, HasilKelayakan, RiwayatAlur, StatusTA } from '../lib/akademik/types'
import { keIcs, formatJamWib, formatTanggalWib, type Tenggat } from '../lib/tenggat'
import { formatUkuran, labelTipe, unggahBerkas, type AturanUnggah, type MetaBerkas } from '../lib/upload'

/** Label selama aturan belum diverifikasi manusia (T-ATURAN #1). */
export function AturanContoh({ aturan }: { aturan: AturanAkademik }) {
  if (!aturanContoh(aturan)) return null
  return (
    <p className="mb-4 flex items-start gap-1.5 rounded-2xl bg-[color-mix(in_srgb,var(--amber)_12%,transparent)] px-3 py-2 text-xs text-amber" role="note">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <strong>Aturan contoh.</strong> Syarat & angka belum diverifikasi BAAK. Keputusan resmi tetap dari kampus.
      </span>
    </p>
  )
}

/** Wajib di setiap layar peran non-mahasiswa (T-ATURAN #2, T08 #7). */
export function BannerDemoPeran() {
  return (
    <div role="note" className="mb-4 flex items-start gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--rose)_40%,transparent)] bg-[color-mix(in_srgb,var(--rose)_10%,transparent)] p-3 text-xs text-rose">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong>Layar demo.</strong> Peran bisa diganti dari Profil, jadi layar ini TIDAK aman dan tidak boleh dipakai untuk data asli sampai server
        menegakkan hak akses (TODO BFF-AUTHZ).
      </span>
    </div>
  )
}

/** Daftar syarat: status ditandai ikon + teks (bukan warna saja) dan ringkasan untuk pembaca layar. */
export function DaftarSyarat({ hasil, go }: { hasil: HasilKelayakan; go?: (r: string) => void }) {
  return (
    <div>
      <p className="sr-only" aria-live="polite">{ringkasKelayakan(hasil)}</p>
      <ul className="space-y-1.5">
        {hasil.syarat.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-sm">
            {s.terpenuhi ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-label="Terpenuhi" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose" aria-label="Belum terpenuhi" />}
            <span className="flex-1">
              <span className="font-semibold">{s.label}:</span> <span className="text-mid">{s.alasan}</span>
            </span>
            {!s.terpenuhi && s.tautanPerbaikan && go && (
              <button onClick={() => go(s.tautanPerbaikan!)} className="min-h-11 shrink-0 px-1 text-xs font-semibold text-cyan hover:underline">
                Perbaiki
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Unggah dengan validasi, hash SHA-256, dan progres nyata (src/lib/upload.ts). */
export function UnggahBerkas({ aturan, label, onSelesai, kecil = false }: { aturan: AturanUnggah; label: string; onSelesai: (m: MetaBerkas) => void; kecil?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [progres, setProgres] = useState<number | null>(null)
  const [galat, setGalat] = useState('')
  const pilih = async (f: File | undefined) => {
    if (!f) return
    setGalat('')
    setProgres(0)
    try {
      onSelesai(await unggahBerkas(f, aturan, setProgres))
    } catch (e) {
      setGalat((e as Error).message)
    } finally {
      setProgres(null)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <div>
      <input ref={input} type="file" accept={aturan.tipe.join(',')} className="sr-only" aria-label={label} onChange={(e) => pilih(e.target.files?.[0])} />
      <button
        type="button"
        disabled={progres !== null}
        onClick={() => input.current?.click()}
        className={`flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 font-semibold disabled:opacity-60 ${kecil ? 'text-xs' : 'text-sm'}`}
      >
        <Upload className="h-4 w-4" aria-hidden /> {progres !== null ? `Mengunggah ${progres}%` : label}
      </button>
      {progres !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={progres} aria-valuemin={0} aria-valuemax={100} aria-label="Progres unggah">
          <div className="h-full bg-[var(--primary)] transition-[width]" style={{ width: `${progres}%` }} />
        </div>
      )}
      <p className="mt-1 text-[11px] text-low">
        {labelTipe(aturan.tipe)} · maks {aturan.maksMB} MB · isi berkas tidak disimpan di perangkat ini
      </p>
      {galat && (
        <p role="alert" className="mt-1 text-xs text-rose">
          {galat}
        </p>
      )}
    </div>
  )
}

export const ringkasHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`
export const metaBerkas = (m: { nama: string; ukuran: number; sha256: string }) => `${m.nama} · ${formatUkuran(m.ukuran)} · SHA-256 ${ringkasHash(m.sha256)}`

/** Unduh tenggat sebagai .ics (alarm ikut). */
export function TombolIcs({ tenggat, nama = 'super-unpam.ics', children = 'Tambah ke kalender' }: { tenggat: Tenggat[]; nama?: string; children?: ReactNode }) {
  const unduh = () => {
    const url = URL.createObjectURL(new Blob([keIcs(tenggat)], { type: 'text/calendar;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: nama })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <button onClick={unduh} disabled={!tenggat.length} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold disabled:opacity-50">
      <CalendarPlus className="h-4 w-4" aria-hidden /> {children}
    </button>
  )
}

export const waktuSesi = (s: { mulai: string; selesai: string }) => `${formatTanggalWib(s.mulai)} · ${formatJamWib(s.mulai)}–${formatJamWib(s.selesai)} WIB`

/** Stepper alur TA: langkah utama + riwayat (termasuk penolakan) dengan tanggal, pelaku, catatan. */
export function StepperAlur({ status, riwayat }: { status: StatusTA; riwayat: RiwayatAlur[] }) {
  const aktif = indeksLangkah(status)
  return (
    <div>
      <ol className="no-scrollbar flex gap-1 overflow-x-auto pb-2" aria-label={`Tahap saat ini: ${LABEL_STATUS[status]}`}>
        {URUTAN_STATUS.map((s, i) => (
          <li key={s} className="flex shrink-0 flex-col items-center gap-1" aria-current={i === aktif ? 'step' : undefined}>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < aktif ? 'bg-[color-mix(in_srgb,var(--mint)_18%,transparent)] text-mint' : i === aktif ? 'btn-primary' : 'bg-glass-strong text-low'}`}
            >
              {i < aktif ? '✓' : i + 1}
            </span>
            <span className={`w-20 text-center text-[10px] leading-tight ${i === aktif ? 'font-semibold text-hi' : 'text-low'}`}>{LABEL_STATUS[s]}</span>
          </li>
        ))}
      </ol>
      {status === 'DITOLAK' && <p className="mt-1 text-sm font-semibold text-rose">Pengajuan ditolak. Lihat alasan di riwayat di bawah.</p>}
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-cyan">Riwayat ({riwayat.length})</summary>
        <ol className="mt-2 space-y-2 border-l border-line pl-4">
          {[...riwayat].reverse().map((r, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-1.5">
                {r.ke === 'DITOLAK' ? <XCircle className="h-4 w-4 text-rose" aria-hidden /> : <Circle className="h-3 w-3 text-cyan" aria-hidden />}
                <span className="font-semibold">{LABEL_STATUS[r.ke]}</span>
                <span className="text-xs text-low">
                  {formatTanggalWib(r.peristiwa.pada)} · {r.peristiwa.oleh}
                </span>
              </div>
              {(r.peristiwa.alasan || r.peristiwa.catatan) && <p className="ml-5 text-xs text-mid">{r.peristiwa.alasan ?? r.peristiwa.catatan}</p>}
            </li>
          ))}
        </ol>
      </details>
    </div>
  )
}
