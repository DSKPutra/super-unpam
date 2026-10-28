import { request } from '../api'
import type { JadwalUjianSemester, JenisUjianSemester, PengajuanUjian, ProfilKelayakan } from '../akademik/types'
import type { DariSumber } from '../types'

/** Sumber data Exam Center (MY UNPAM). Komponen hanya mengenal antarmuka ini. */
export interface SumberUjian {
  jadwal(jenis: JenisUjianSemester): Promise<DariSumber<JadwalUjianSemester>>
  kelayakan(): Promise<DariSumber<ProfilKelayakan>>
  pengajuan(): Promise<DariSumber<PengajuanUjian[]>>
  ajukan(input: Omit<PengajuanUjian, 'id' | 'status' | 'diajukan'>): Promise<DariSumber<PengajuanUjian>>
}

const demo = () => import('../../data/demo')
const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })

/** Data contoh di klien (mode demo). Pengajuan tidak dikirim ke mana pun. */
export const ujianDemo: SumberUjian = {
  jadwal: async (jenis) => contoh((await demo()).ujianSemester[jenis]),
  kelayakan: async () => contoh((await demo()).profilKelayakan),
  pengajuan: async () => contoh((await demo()).pengajuanUjian),
  ajukan: async (input) => contoh({ ...input, id: `pj-${Date.now().toString(36)}`, status: 'DIAJUKAN', diajukan: new Date().toISOString() }),
}

/** BFF: /api/ujian/* (api/ujian/[action].ts). */
export const ujianHttp: SumberUjian = {
  jadwal: (jenis) => request(`ujian/jadwal?jenis=${jenis}`),
  kelayakan: () => request('ujian/kelayakan'),
  pengajuan: () => request('ujian/pengajuan'),
  ajukan: (input) => request('ujian/pengajuan', { method: 'POST', body: JSON.stringify(input) }),
}
