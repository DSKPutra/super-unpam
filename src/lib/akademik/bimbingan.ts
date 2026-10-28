import type { Bimbingan, VersiDraf } from './types'

/** Hanya entri yang DISETUJUI dosen yang sah dan dihitung untuk syarat ujian. */
export const hitungBimbinganSah = (entri: Bimbingan[]) => entri.filter((e) => e.status === 'DISETUJUI').length

/** Entri sah saja, urut tanggal — untuk kartu bimbingan. */
export const entriSah = (entri: Bimbingan[]) => entri.filter((e) => e.status === 'DISETUJUI').sort((a, b) => a.tanggal.localeCompare(b.tanggal))

/**
 * Pengingat halus bila jeda sejak bimbingan terakhir (status apa pun selain DITOLAK) melebihi ambang.
 * Mengembalikan jumlah hari jeda bila perlu pengingat, atau null.
 */
export function jedaBimbingan(entri: Bimbingan[], sekarang: Date, ambangHari: number, mulai?: string): number | null {
  const tanggal = entri.filter((e) => e.status !== 'DITOLAK').map((e) => new Date(e.tanggal).getTime())
  const acuan = tanggal.length ? Math.max(...tanggal) : mulai ? new Date(mulai).getTime() : null
  if (acuan === null) return null
  const hari = Math.floor((sekarang.getTime() - acuan) / 86400_000)
  return hari > ambangHari ? hari : null
}

/**
 * Tambah versi draf baru. Tidak pernah menimpa: nomor versi selalu naik.
 * Menolak hash yang sama dengan versi terakhir (unggahan ganda tanpa perubahan).
 */
export function tambahVersi(daftar: VersiDraf[], baru: Omit<VersiDraf, 'versi'>): { ok: true; daftar: VersiDraf[] } | { ok: false; galat: string } {
  const terakhir = daftar[daftar.length - 1]
  if (terakhir && terakhir.sha256 === baru.sha256) return { ok: false, galat: `Berkas identik dengan v${terakhir.versi} (hash sama). Tidak ada perubahan untuk disimpan.` }
  return { ok: true, daftar: [...daftar, { ...baru, versi: (terakhir?.versi ?? 0) + 1 }] }
}
