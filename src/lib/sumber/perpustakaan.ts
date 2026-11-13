import { request } from '../api'
import type { DariSumber } from '../types'
import type { KaryaAkhir, Koleksi } from '../perpustakaan/repositori'

/** Sumber data Digital Library: katalog koleksi dan repositori skripsi/tesis/disertasi lulusan. */
export interface SumberPerpustakaan {
  repositori(): Promise<DariSumber<KaryaAkhir[]>>
  katalog(): Promise<DariSumber<Koleksi[]>>
}

const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })
const demo = () => import('../../data/perpustakaan-contoh')

export const perpustakaanDemo: SumberPerpustakaan = {
  repositori: async () => contoh((await demo()).karyaContoh),
  katalog: async () => contoh((await demo()).koleksiContoh),
}

/** BFF: /api/campus/repositori & /api/campus/katalog (digabung ke fungsi campus; batas 12 fungsi Vercel Hobby). */
export const perpustakaanHttp: SumberPerpustakaan = {
  repositori: () => request('campus/repositori'),
  katalog: () => request('campus/katalog'),
}
