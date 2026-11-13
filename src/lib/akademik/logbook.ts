import type { AturanProdi } from '../../data/aturan-akademik.js'
import type { Bimbingan, JenisUjian, StatusTugasAkhir, TugasAkhir, VersiDraf } from './types.js'

// Logbook bimbingan dan versi draf (T04). Fungsi murni; tes di logbook.test.ts.

const HARI = 86_400_000

/** Hanya entri yang disetujui dosen yang sah dan dihitung. */
export const bimbinganSah = (entri: Bimbingan[]) => entri.filter((e) => e.status === 'DISETUJUI')

/** Ujian akhir berikutnya yang bergantung pada jumlah bimbingan, menurut tahap alur. */
export function ujianBerikutnya(status: StatusTugasAkhir): JenisUjian | null {
  if (['DISETUJUI_PEMBIMBING', 'BIMBINGAN', 'LAYAK_PROPOSAL'].includes(status)) return 'PROPOSAL'
  if (['REVISI_PROPOSAL', 'PENELITIAN', 'LAYAK_UJIAN_AKHIR'].includes(status)) return 'SIDANG'
  return null
}

export interface TargetBimbingan {
  jenis: JenisUjian
  namaUjian: string
  minimal: number
  sah: number
  terpenuhi: boolean
  /** true bila ambang masih nilai contoh. */
  contoh: boolean
}

/** "3 dari 4 bimbingan disetujui" untuk ujian berikutnya; minimum dari konfigurasi, bukan kode. */
export function targetBimbingan(entri: Bimbingan[], status: StatusTugasAkhir, aturan: AturanProdi): TargetBimbingan | null {
  const jenis = ujianBerikutnya(status)
  const u = jenis && aturan.ujian.find((x) => x.jenis === jenis)
  const syarat = u?.syarat.find((s) => s.id === 'bimbingan')
  if (!jenis || !u || syarat?.id !== 'bimbingan') return null
  const sah = bimbinganSah(entri).length
  return { jenis, namaUjian: u.nama, minimal: syarat.minimal, sah, terpenuhi: sah >= syarat.minimal, contoh: u.sumber === null }
}

/**
 * Pengingat halus bila tidak ada bimbingan lebih dari `jedaHari`. Dihitung dari entri terakhir
 * (status apa pun, karena pertemuan tetap terjadi) atau dari saat bimbingan dimulai.
 */
export function cekJedaBimbingan(entri: Bimbingan[], mulai: string | undefined, jedaHari: number, now = Date.now()): { perlu: boolean; hari: number } | null {
  const acuan = [...entri.map((e) => Date.parse(e.tanggal)), ...(mulai ? [Date.parse(mulai)] : [])].filter((t) => !Number.isNaN(t))
  if (acuan.length === 0) return null
  const hari = Math.floor((now - Math.max(...acuan)) / HARI)
  return { perlu: hari > jedaHari, hari }
}

/** Waktu bimbingan dimulai (transisi ke BIMBINGAN) dari riwayat alur. */
export const mulaiBimbingan = (ta: TugasAkhir) => ta.riwayat.find((r) => r.ke === 'BIMBINGAN')?.waktu

export function validasiEntri(e: Pick<Bimbingan, 'tanggal' | 'bagian' | 'ringkasan' | 'tugasBerikutnya'>, now = Date.now()): Partial<Record<'tanggal' | 'bagian' | 'ringkasan' | 'tenggat', string>> {
  const g: Partial<Record<'tanggal' | 'bagian' | 'ringkasan' | 'tenggat', string>> = {}
  const t = Date.parse(e.tanggal)
  if (Number.isNaN(t)) g.tanggal = 'Tanggal bimbingan wajib diisi.'
  else if (t > now) g.tanggal = 'Tanggal bimbingan tidak boleh di masa depan.'
  if (!e.bagian.trim()) g.bagian = 'Bagian yang dibahas wajib diisi.'
  if (e.ringkasan.trim().length < 20) g.ringkasan = 'Ringkasan arahan minimal 20 karakter.'
  const tg = e.tugasBerikutnya?.tenggat
  if (tg && !Number.isNaN(t) && Date.parse(tg) <= t) g.tenggat = 'Tenggat tugas harus setelah tanggal bimbingan.'
  return g
}

export class VersiDitolak extends Error {}

/**
 * Menambah versi draf baru tanpa menimpa yang lama: nomor versi selalu naik, isi yang identik dengan
 * versi terakhir (hash sama) ditolak agar tidak ada "versi baru" palsu.
 */
export function tambahVersi(daftar: VersiDraf[], berkas: Omit<VersiDraf, 'versi' | 'diunggah'>, now = new Date()): VersiDraf[] {
  if (!/^[0-9a-f]{64}$/.test(berkas.sha256)) throw new VersiDitolak('Hash SHA-256 tidak valid.')
  const terakhir = daftar.reduce<VersiDraf | null>((a, v) => (!a || v.versi > a.versi ? v : a), null)
  if (terakhir?.sha256 === berkas.sha256) throw new VersiDitolak(`Isi berkas sama dengan versi v${terakhir.versi}.`)
  if (!berkas.catatan.trim()) throw new VersiDitolak('Catatan perubahan wajib diisi.')
  return [...daftar, { ...berkas, versi: (terakhir?.versi ?? 0) + 1, diunggah: now.toISOString() }]
}

/** Validasi berkas draf terhadap konfigurasi (tipe dan ukuran). */
export function validasiBerkasDraf(f: { size: number; type: string }, aturan: AturanProdi): string | null {
  if (!aturan.drafNaskah.tipe.includes(f.type)) return 'Tipe berkas tidak diterima (PDF atau DOCX).'
  if (f.size === 0) return 'Berkas kosong.'
  if (f.size > aturan.drafNaskah.maksMB * 1024 * 1024) return `Ukuran melebihi ${aturan.drafNaskah.maksMB} MB.`
  return null
}

/** SHA-256 heksadesimal memakai Web Crypto (tersedia di browser dan Node ≥ 19). */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
