import { request } from '../api'
import type { DariSumber, JadwalTes, PendaftaranTes, RingkasanToefl } from '../types'

/** Sumber data TOEFL (MY LB). Komponen hanya mengenal antarmuka ini, bukan implementasinya. */
export interface SumberToefl {
  daftarJadwal(): Promise<DariSumber<JadwalTes[]>>
  ringkasan(): Promise<DariSumber<RingkasanToefl>>
  daftar(jadwalId: string): Promise<DariSumber<PendaftaranTes>>
}

const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })
const demo = () => import('../../data/demo')

/** Data contoh di klien (mode demo). Pendaftaran tidak dikirim ke mana pun. */
export const toeflDemo: SumberToefl = {
  daftarJadwal: async () => contoh((await demo()).jadwalTes),
  ringkasan: async () => contoh((await demo()).toefl),
  daftar: async (jadwalId) => contoh({ id: `pt-${jadwalId}`, jadwalId, status: 'menunggu-bayar' }),
}

/** BFF: /api/toefl/* (api/toefl/[action].ts). Label asal ditentukan server. */
export const toeflHttp: SumberToefl = {
  daftarJadwal: () => request('toefl/jadwal'),
  ringkasan: () => request('toefl/ringkasan'),
  daftar: (jadwalId) => request('toefl/daftar', { method: 'POST', body: JSON.stringify({ jadwalId }) }),
}
