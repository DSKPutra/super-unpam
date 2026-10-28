import type { JenisPeristiwa, Peristiwa, RiwayatAlur, StatusTA } from './types'

/** Urutan status untuk stepper (DITOLAK adalah cabang, bukan langkah utama). */
export const URUTAN_STATUS: StatusTA[] = [
  'DRAF_JUDUL',
  'DIAJUKAN',
  'DISETUJUI_PEMBIMBING',
  'BIMBINGAN',
  'LAYAK_PROPOSAL',
  'UJIAN_PROPOSAL',
  'REVISI_PROPOSAL',
  'PENELITIAN',
  'LAYAK_UJIAN_AKHIR',
  'UJIAN_AKHIR',
  'REVISI_AKHIR',
  'YUDISIUM',
  'SELESAI',
]

export const LABEL_STATUS: Record<StatusTA, string> = {
  DRAF_JUDUL: 'Draf judul',
  DIAJUKAN: 'Diajukan',
  DITOLAK: 'Ditolak',
  DISETUJUI_PEMBIMBING: 'Pembimbing ditetapkan',
  BIMBINGAN: 'Bimbingan',
  LAYAK_PROPOSAL: 'Layak proposal',
  UJIAN_PROPOSAL: 'Ujian proposal',
  REVISI_PROPOSAL: 'Revisi proposal',
  PENELITIAN: 'Penelitian',
  LAYAK_UJIAN_AKHIR: 'Layak ujian akhir',
  UJIAN_AKHIR: 'Ujian akhir',
  REVISI_AKHIR: 'Revisi akhir',
  YUDISIUM: 'Yudisium',
  SELESAI: 'Selesai',
}

/** Tabel transisi sah. Semua yang tidak ada di tabel DITOLAK. */
export const TRANSISI: Partial<Record<StatusTA, Partial<Record<JenisPeristiwa, StatusTA>>>> = {
  DRAF_JUDUL: { AJUKAN: 'DIAJUKAN' },
  DIAJUKAN: { SETUJUI_PEMBIMBING: 'DISETUJUI_PEMBIMBING', TOLAK: 'DITOLAK' },
  DITOLAK: { AJUKAN_ULANG: 'DRAF_JUDUL' },
  DISETUJUI_PEMBIMBING: { MULAI_BIMBINGAN: 'BIMBINGAN' },
  BIMBINGAN: { NYATAKAN_LAYAK_PROPOSAL: 'LAYAK_PROPOSAL' },
  LAYAK_PROPOSAL: { JADWALKAN_UJIAN: 'UJIAN_PROPOSAL' },
  UJIAN_PROPOSAL: { LULUS: 'PENELITIAN', LULUS_DENGAN_REVISI: 'REVISI_PROPOSAL', TIDAK_LULUS: 'BIMBINGAN' },
  REVISI_PROPOSAL: { REVISI_DISETUJUI: 'PENELITIAN' },
  PENELITIAN: { NYATAKAN_LAYAK_AKHIR: 'LAYAK_UJIAN_AKHIR' },
  LAYAK_UJIAN_AKHIR: { JADWALKAN_UJIAN: 'UJIAN_AKHIR' },
  UJIAN_AKHIR: { LULUS: 'YUDISIUM', LULUS_DENGAN_REVISI: 'REVISI_AKHIR', TIDAK_LULUS: 'PENELITIAN' },
  REVISI_AKHIR: { REVISI_DISETUJUI: 'YUDISIUM' },
  YUDISIUM: { SELESAIKAN: 'SELESAI' },
}

export interface KeadaanAlur {
  status: StatusTA
  riwayat: RiwayatAlur[]
}

export interface KonteksAlur {
  judul: string
  pilihanPembimbing: string[]
  /** Pembimbing yang DITETAPKAN (bukan sekadar dipilih). */
  pembimbing: string[]
}

export type HasilTransisi = { ok: true; keadaan: KeadaanAlur } | { ok: false; galat: string }

/**
 * Terapkan peristiwa ke keadaan. Menolak transisi tidak sah & penjaga (guard) yang gagal,
 * dan mencatat riwayat (tidak pernah dihapus, termasuk penolakan). Fungsi murni.
 */
export function transisi(k: KeadaanAlur, p: Peristiwa, ctx: KonteksAlur): HasilTransisi {
  const ke = TRANSISI[k.status]?.[p.jenis]
  if (!ke) return { ok: false, galat: `Peristiwa ${p.jenis} tidak sah dari status ${LABEL_STATUS[k.status]}.` }
  if ((p.jenis === 'TOLAK' || p.jenis === 'TIDAK_LULUS') && !p.alasan?.trim()) return { ok: false, galat: 'Alasan wajib diisi.' }
  if (p.jenis === 'AJUKAN' && !ctx.judul.trim()) return { ok: false, galat: 'Judul belum diisi.' }
  if (p.jenis === 'AJUKAN' && ctx.pilihanPembimbing.length === 0) return { ok: false, galat: 'Pilih minimal satu calon pembimbing.' }
  if ((p.jenis === 'SETUJUI_PEMBIMBING' || p.jenis === 'MULAI_BIMBINGAN') && ctx.pembimbing.length === 0)
    return { ok: false, galat: 'Pembimbing belum ditetapkan.' }
  return { ok: true, keadaan: { status: ke, riwayat: [...k.riwayat, { dari: k.status, ke, peristiwa: p }] } }
}

/** Peristiwa yang sah dari status saat ini (untuk tombol aksi). */
export const peristiwaSah = (s: StatusTA) => Object.keys(TRANSISI[s] ?? {}) as JenisPeristiwa[]

/** Indeks langkah utama untuk stepper (DITOLAK dipetakan ke DIAJUKAN). */
export const indeksLangkah = (s: StatusTA) => URUTAN_STATUS.indexOf(s === 'DITOLAK' ? 'DIAJUKAN' : s)
