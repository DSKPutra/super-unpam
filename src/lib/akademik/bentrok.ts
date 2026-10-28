import type { SesiUjian } from './types'

export interface Bentrok {
  a: SesiUjian
  b: SesiUjian
  /** Orang (NIM/NIDN) yang terkena bentrok. */
  orang: string[]
}

const ms = (iso: string) => new Date(iso).getTime()

/**
 * Bentrok = rentang waktu beririsan. Batas bersinggungan tepat (selesai A == mulai B) BUKAN bentrok.
 * Semua waktu WIB (satu zona, tanpa DST). Bila `untuk` diisi, hanya bentrok yang melibatkan orang itu.
 */
export function deteksiBentrok(sesi: SesiUjian[], untuk?: string): Bentrok[] {
  const list = untuk ? sesi.filter((s) => s.peserta.includes(untuk)) : sesi
  const urut = [...list].sort((x, y) => ms(x.mulai) - ms(y.mulai))
  const hasil: Bentrok[] = []
  for (let i = 0; i < urut.length; i++) {
    for (let j = i + 1; j < urut.length; j++) {
      const a = urut[i]
      const b = urut[j]
      if (ms(b.mulai) >= ms(a.selesai)) break // terurut: sesi berikutnya pasti tak beririsan dengan a
      const orang = a.peserta.filter((p) => b.peserta.includes(p))
      if (orang.length) hasil.push({ a, b, orang })
    }
  }
  return hasil
}

export interface Beruntun {
  a: SesiUjian
  b: SesiUjian
  jedaMenit: number
}

/** Ujian berurutan dengan jeda < ambang (tetapi tidak bentrok) untuk orang yang sama. */
export function deteksiBeruntun(sesi: SesiUjian[], untuk: string, ambangMenit: number): Beruntun[] {
  const urut = sesi.filter((s) => s.peserta.includes(untuk)).sort((x, y) => ms(x.mulai) - ms(y.mulai))
  const hasil: Beruntun[] = []
  for (let i = 1; i < urut.length; i++) {
    const jeda = (ms(urut[i].mulai) - ms(urut[i - 1].selesai)) / 60000
    if (jeda >= 0 && jeda < ambangMenit) hasil.push({ a: urut[i - 1], b: urut[i], jedaMenit: jeda })
  }
  return hasil
}
