import { USE_DEMO } from '../api'
import type { Resource } from '../useResource'
import { sertifikasiDemo, sertifikasiHttp, type SumberSertifikasi } from './sertifikasi'
import { toeflDemo, toeflHttp, type SumberToefl } from './toefl'

// Satu tempat memilih implementasi sumber data. Saat API resmi tersedia, BFF yang berganti
// (CONNECTOR_MY_LB=http); klien tetap memakai implementasi http yang sama.
export const sumber: { toefl: SumberToefl; sertifikasi: SumberSertifikasi } = USE_DEMO
  ? { toefl: toeflDemo, sertifikasi: sertifikasiDemo }
  : { toefl: toeflHttp, sertifikasi: sertifikasiHttp }

export type StatusSumber = { tone: 'green' | 'slate' | 'red' | 'blue'; teks: string }

/**
 * Label koneksi yang jujur: "Terhubung ke <sistem>" HANYA bila server menjawab dengan data asli
 * sistem itu; data mock/klien selalu "Data contoh".
 */
export function statusSumber(res: Pick<Resource<{ asal: string }>, 'data' | 'error' | 'loading'>, sistem: 'MyLB' | 'MyLSP'): StatusSumber {
  if (res.data) return res.data.asal === sistem ? { tone: 'green', teks: `Terhubung ke ${sistem}` } : { tone: 'slate', teks: 'Data contoh' }
  if (res.error) return { tone: 'red', teks: `Tidak dapat terhubung ke ${sistem}` }
  return { tone: 'blue', teks: `Menghubungkan ke ${sistem}…` }
}
