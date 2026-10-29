import { request } from '../api'
import type { DariSumber, RingkasanSertifikasi, UjianKompetensi } from '../types'

/** Sumber data sertifikasi kompetensi (MY LSP). */
export interface SumberSertifikasi {
  ringkasan(): Promise<DariSumber<RingkasanSertifikasi>>
  daftar(skemaId: string): Promise<DariSumber<UjianKompetensi>>
}

const demo = () => import('../../data/demo')

export const sertifikasiDemo: SumberSertifikasi = {
  ringkasan: async () => ({ data: (await demo()).sertifikasi, asal: 'contoh' }),
  daftar: async (skemaId) => ({ data: { id: `uk-${skemaId}`, skemaId, status: 'terdaftar' }, asal: 'contoh' }),
}

export const sertifikasiHttp: SumberSertifikasi = {
  ringkasan: () => request('sertifikasi/ringkasan'),
  daftar: (skemaId) => request('sertifikasi/daftar', { method: 'POST', body: JSON.stringify({ skemaId }) }),
}
