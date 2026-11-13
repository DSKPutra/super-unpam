import type { StatusTugasAkhir } from '../../lib/akademik/types'

export const LABEL_STATUS: Record<StatusTugasAkhir, string> = {
  DRAF_JUDUL: 'Draf judul',
  DIAJUKAN: 'Diajukan',
  DITOLAK: 'Ditolak',
  DISETUJUI_PEMBIMBING: 'Pembimbing ditetapkan',
  BIMBINGAN: 'Bimbingan',
  LAYAK_PROPOSAL: 'Layak proposal',
  UJIAN_PROPOSAL: 'Seminar proposal',
  REVISI_PROPOSAL: 'Revisi proposal',
  PENELITIAN: 'Penelitian',
  LAYAK_UJIAN_AKHIR: 'Layak ujian akhir',
  UJIAN_AKHIR: 'Ujian akhir',
  REVISI_AKHIR: 'Revisi akhir',
  YUDISIUM: 'Yudisium',
  SELESAI: 'Selesai',
}
