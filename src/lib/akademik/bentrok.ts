import type { SesiUjian } from './types.js'

// Deteksi bentrok jadwal untuk mahasiswa (semua sesinya) dan dosen (sesi yang ia awasi/uji).
// Semua waktu WIB; tidak ada perbedaan zona waktu. Sesi yang bersinggungan tepat di batas
// (selesai 10:00, mulai 10:00) TIDAK bentrok.

/** Apa pun yang punya rentang waktu: sesi ujian, agenda dosen (T08), dsb. */
export type Rentang = Pick<SesiUjian, 'id' | 'mulai' | 'selesai'>

export interface Bentrok<T extends Rentang = SesiUjian> {
  a: T
  b: T
}

export interface Beruntun {
  sebelum: SesiUjian
  sesudah: SesiUjian
  jedaMenit: number
}

const t = (iso: string) => {
  const v = Date.parse(iso)
  if (Number.isNaN(v)) throw new Error(`Tanggal tidak valid: ${iso}`)
  return v
}

function urut<T extends Rentang>(sesi: T[]): T[] {
  for (const s of sesi) if (t(s.selesai) <= t(s.mulai)) throw new Error(`Sesi ${s.id}: selesai harus setelah mulai.`)
  return [...sesi].sort((x, y) => t(x.mulai) - t(y.mulai) || x.id.localeCompare(y.id))
}

export function deteksiBentrok<T extends Rentang = SesiUjian>(sesi: T[]): Bentrok<T>[] {
  const s = urut(sesi)
  const out: Bentrok<T>[] = []
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length && t(s[j].mulai) < t(s[i].selesai); j++) out.push({ a: s[i], b: s[j] })
  return out
}

/** Pasangan sesi berurutan yang tidak bentrok tetapi jedanya kurang dari `jedaMinimalMenit`. */
export function deteksiBeruntun(sesi: SesiUjian[], jedaMinimalMenit: number): Beruntun[] {
  const s = urut(sesi)
  const out: Beruntun[] = []
  for (let i = 0; i + 1 < s.length; i++) {
    const jeda = (t(s[i + 1].mulai) - t(s[i].selesai)) / 60_000
    if (jeda >= 0 && jeda < jedaMinimalMenit) out.push({ sebelum: s[i], sesudah: s[i + 1], jedaMenit: jeda })
  }
  return out
}

/** Sesi milik seorang petugas (pengawas/penguji) untuk deteksi bentrok sisi dosen. */
export const sesiPetugas = (sesi: SesiUjian[], petugas: string) => sesi.filter((s) => s.petugas.includes(petugas))
