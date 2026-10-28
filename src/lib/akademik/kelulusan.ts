import type { Revisi } from './types'

/** Revisi terlambat = belum disetujui dan tenggat sudah lewat. */
export const revisiTerlambat = (r: Revisi, sekarang: Date) => r.status !== 'DISETUJUI' && new Date(r.tenggat).getTime() < sekarang.getTime()

/** Lembar pengesahan hanya boleh dibuat bila ADA revisi dan SEMUA sudah disetujui penguji. */
export function bolehBuatPengesahan(revisi: Revisi[]): { boleh: boolean; alasan: string } {
  const terbuka = revisi.filter((r) => r.status !== 'DISETUJUI')
  if (terbuka.length) return { boleh: false, alasan: `${terbuka.length} butir revisi belum disetujui penguji` }
  return { boleh: true, alasan: 'Semua revisi disetujui' }
}

export type StatusChecklist = 'BELUM' | 'DIPROSES' | 'SELESAI'

export interface ItemChecklist {
  id: string
  nama: string
  rute: string
  status: StatusChecklist
}

/** Checklist administrasi lulus: menolak "selesai" bila ada item belum. */
export function ringkasChecklist(items: ItemChecklist[]) {
  const selesai = items.filter((i) => i.status === 'SELESAI').length
  return { selesai, total: items.length, lengkap: items.length > 0 && selesai === items.length }
}
