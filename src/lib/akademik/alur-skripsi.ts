import type { PeranAlur, RiwayatAlur, StatusTugasAkhir, TugasAkhir } from './types.js'

// Mesin status tugas akhir yang tegas: hanya transisi di tabel yang sah, dengan pelaku yang boleh,
// dan penjaga (guard) yang memeriksa konteks. Transisi lain ditolak dan tidak mengubah apa pun.
// Tabel dapat diganti per prodi lewat parameter `tabel`.

export type Peristiwa =
  | 'AJUKAN_JUDUL'
  | 'SETUJUI_JUDUL'
  | 'TOLAK_JUDUL'
  | 'AJUKAN_ULANG'
  | 'MULAI_BIMBINGAN'
  | 'NYATAKAN_LAYAK_PROPOSAL'
  | 'JADWALKAN_PROPOSAL'
  | 'HASIL_LULUS'
  | 'HASIL_REVISI'
  | 'HASIL_TIDAK_LULUS'
  | 'REVISI_DISETUJUI'
  | 'NYATAKAN_LAYAK_AKHIR'
  | 'JADWALKAN_AKHIR'
  | 'SELESAIKAN'

export interface KonteksTransisi {
  pelaku: PeranAlur
  /** Hasil evaluasiKelayakan untuk transisi "layak"; wajib true agar lolos. */
  layak?: boolean
  pembimbing?: string[]
  catatan?: string
  /** Waktu kejadian (ISO). Bawaan: sekarang. */
  waktu?: string
}

export interface AturanTransisi {
  dari: StatusTugasAkhir
  peristiwa: Peristiwa
  ke: StatusTugasAkhir
  pelaku: PeranAlur[]
  /** Pesan galat bila penjaga gagal; undefined = lolos. */
  jaga?: (k: KonteksTransisi, ta: TugasAkhir) => string | undefined
}

const perluLayak = (k: KonteksTransisi) => (k.layak ? undefined : 'Syarat kelayakan belum terpenuhi.')
const perluCatatan = (k: KonteksTransisi) => (k.catatan?.trim() ? undefined : 'Alasan wajib diisi.')

export const TABEL_ALUR: AturanTransisi[] = [
  { dari: 'DRAF_JUDUL', peristiwa: 'AJUKAN_JUDUL', ke: 'DIAJUKAN', pelaku: ['MAHASISWA'], jaga: (_, ta) => (ta.judul.trim() ? undefined : 'Judul belum diisi.') },
  { dari: 'DIAJUKAN', peristiwa: 'SETUJUI_JUDUL', ke: 'DISETUJUI_PEMBIMBING', pelaku: ['DOSEN', 'PRODI'], jaga: (k) => (k.pembimbing?.length ? undefined : 'Pembimbing belum ditetapkan.') },
  { dari: 'DIAJUKAN', peristiwa: 'TOLAK_JUDUL', ke: 'DITOLAK', pelaku: ['DOSEN', 'PRODI'], jaga: perluCatatan },
  { dari: 'DITOLAK', peristiwa: 'AJUKAN_ULANG', ke: 'DRAF_JUDUL', pelaku: ['MAHASISWA'] },
  { dari: 'DISETUJUI_PEMBIMBING', peristiwa: 'MULAI_BIMBINGAN', ke: 'BIMBINGAN', pelaku: ['MAHASISWA', 'DOSEN'], jaga: (_, ta) => (ta.pembimbing.length ? undefined : 'Tidak bisa bimbingan tanpa pembimbing.') },
  { dari: 'BIMBINGAN', peristiwa: 'NYATAKAN_LAYAK_PROPOSAL', ke: 'LAYAK_PROPOSAL', pelaku: ['DOSEN'], jaga: perluLayak },
  { dari: 'LAYAK_PROPOSAL', peristiwa: 'JADWALKAN_PROPOSAL', ke: 'UJIAN_PROPOSAL', pelaku: ['PRODI'] },
  { dari: 'UJIAN_PROPOSAL', peristiwa: 'HASIL_LULUS', ke: 'PENELITIAN', pelaku: ['PRODI'] },
  { dari: 'UJIAN_PROPOSAL', peristiwa: 'HASIL_REVISI', ke: 'REVISI_PROPOSAL', pelaku: ['PRODI'] },
  { dari: 'UJIAN_PROPOSAL', peristiwa: 'HASIL_TIDAK_LULUS', ke: 'BIMBINGAN', pelaku: ['PRODI'], jaga: perluCatatan },
  { dari: 'REVISI_PROPOSAL', peristiwa: 'REVISI_DISETUJUI', ke: 'PENELITIAN', pelaku: ['DOSEN'] },
  { dari: 'PENELITIAN', peristiwa: 'NYATAKAN_LAYAK_AKHIR', ke: 'LAYAK_UJIAN_AKHIR', pelaku: ['DOSEN'], jaga: perluLayak },
  { dari: 'LAYAK_UJIAN_AKHIR', peristiwa: 'JADWALKAN_AKHIR', ke: 'UJIAN_AKHIR', pelaku: ['PRODI'] },
  { dari: 'UJIAN_AKHIR', peristiwa: 'HASIL_LULUS', ke: 'YUDISIUM', pelaku: ['PRODI'] },
  { dari: 'UJIAN_AKHIR', peristiwa: 'HASIL_REVISI', ke: 'REVISI_AKHIR', pelaku: ['PRODI'] },
  { dari: 'UJIAN_AKHIR', peristiwa: 'HASIL_TIDAK_LULUS', ke: 'PENELITIAN', pelaku: ['PRODI'], jaga: perluCatatan },
  { dari: 'REVISI_AKHIR', peristiwa: 'REVISI_DISETUJUI', ke: 'YUDISIUM', pelaku: ['DOSEN'] },
  { dari: 'YUDISIUM', peristiwa: 'SELESAIKAN', ke: 'SELESAI', pelaku: ['PRODI'] },
]

export type HasilTransisi = { ok: true; ta: TugasAkhir; entri: RiwayatAlur } | { ok: false; galat: string }

export function transisi(ta: TugasAkhir, peristiwa: Peristiwa, k: KonteksTransisi, tabel: AturanTransisi[] = TABEL_ALUR): HasilTransisi {
  const aturan = tabel.find((a) => a.dari === ta.status && a.peristiwa === peristiwa)
  if (!aturan) return { ok: false, galat: `Peristiwa ${peristiwa} tidak sah dari status ${ta.status}.` }
  if (!aturan.pelaku.includes(k.pelaku)) return { ok: false, galat: `${k.pelaku} tidak berwenang melakukan ${peristiwa}.` }
  const g = aturan.jaga?.(k, ta)
  if (g) return { ok: false, galat: g }
  const entri: RiwayatAlur = { dari: ta.status, ke: aturan.ke, peristiwa, pelaku: k.pelaku, waktu: k.waktu ?? new Date().toISOString(), ...(k.catatan ? { catatan: k.catatan } : {}) }
  const pembimbing = peristiwa === 'SETUJUI_JUDUL' && k.pembimbing ? k.pembimbing : ta.pembimbing
  return { ok: true, entri, ta: { ...ta, status: aturan.ke, pembimbing, riwayat: [...ta.riwayat, entri] } }
}

/** Peristiwa yang sah dari status saat ini untuk sebuah peran (untuk menampilkan tombol aksi). */
export const peristiwaTersedia = (status: StatusTugasAkhir, pelaku: PeranAlur, tabel: AturanTransisi[] = TABEL_ALUR) =>
  tabel.filter((a) => a.dari === status && a.pelaku.includes(pelaku)).map((a) => a.peristiwa)

/** Urutan tampilan stepper (jalur utama tanpa cabang penolakan/revisi). */
export const URUTAN_UTAMA: StatusTugasAkhir[] = ['DRAF_JUDUL', 'DIAJUKAN', 'DISETUJUI_PEMBIMBING', 'BIMBINGAN', 'LAYAK_PROPOSAL', 'UJIAN_PROPOSAL', 'PENELITIAN', 'LAYAK_UJIAN_AKHIR', 'UJIAN_AKHIR', 'YUDISIUM', 'SELESAI']
