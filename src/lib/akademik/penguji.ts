import type { AturanUjianAkhir } from './types'

export interface Dosen {
  nidn: string
  nama: string
  email: string
  bidang: string[]
  /** Jumlah mahasiswa bimbingan aktif saat ini. */
  beban: number
  /** Kuota dosen; null = pakai kuota default dari konfigurasi. */
  kuota: number | null
  kuotaDibuka: boolean
}

export const sisaKuota = (d: Dosen, kuotaDefault: number) => Math.max(0, (d.kuota ?? kuotaDefault) - d.beban)

/** Dosen yang masih bisa dipilih sebagai pembimbing (kuota dibuka & tersisa). */
export const dosenTersedia = (daftar: Dosen[], kuotaDefault: number) => daftar.filter((d) => d.kuotaDibuka && sisaKuota(d, kuotaDefault) > 0)

/**
 * Validasi komposisi penguji menurut aturan jenis ujian. Pelanggaran dikembalikan sebagai alasan;
 * daftar kosong = sah. Penegakan resmi tetap di server (TODO(BFF-AUTHZ)).
 */
export function validasiKomposisiPenguji(penguji: string[], pembimbing: string[], aturan: AturanUjianAkhir): string[] {
  const g: string[] = []
  if (new Set(penguji).size !== penguji.length) g.push('Ada penguji yang dipilih lebih dari sekali.')
  if (penguji.length !== aturan.jumlahPenguji) g.push(`${aturan.nama} membutuhkan ${aturan.jumlahPenguji} penguji, terpilih ${penguji.length}.`)
  if (!aturan.pengujiBolehPembimbing) {
    const bentrok = penguji.filter((p) => pembimbing.includes(p))
    if (bentrok.length) g.push(`Pembimbing tidak boleh menjadi penguji (${bentrok.join(', ')}).`)
  }
  return g
}
