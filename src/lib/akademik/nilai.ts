import type { HurufMutu, Rubrik } from '../../data/aturan-akademik.js'
import { validasiRubrik } from './aturan.js'
import type { Penilaian, SkorKriteria } from './types.js'

// Pratinjau nilai ujian akhir dari rubrik konfigurasi. Selalu berlabel "perkiraan": nilai resmi dari server.

export interface PratinjauNilai {
  perkiraan: true
  nilai: number
  huruf: string
  /** Nilai per penguji (urutan sama dengan masukan). */
  perPenguji: number[]
  /** true bila selisih nilai antar penguji melebihi ambang rubrik → perlu rapat kesepakatan. */
  perluKesepakatan: boolean
}

const bulat = (n: number, desimal: number) => {
  const f = 10 ** desimal
  // Math.round dengan koreksi galat float (mis. 1.005 → 1.01).
  return Math.round((n + Number.EPSILON) * f) / f
}

export function hurufDari(nilai: number, tabel: HurufMutu[]): string {
  const h = [...tabel].sort((a, b) => b.min - a.min).find((x) => nilai >= x.min)
  if (!h) throw new Error(`Tidak ada huruf mutu untuk nilai ${nilai}.`)
  return h.huruf
}

/** Nilai satu penguji: rata-rata berbobot skor yang dinormalisasi ke skala 0–100. */
export function nilaiPenguji(r: Rubrik, skor: SkorKriteria[]): number {
  const masalah = validasiRubrik(r)
  if (masalah.length) throw new Error(`Rubrik tidak valid: ${masalah.join(' ')}`)
  let total = 0
  for (const k of r.kriteria) {
    const s = skor.filter((x) => x.kriteriaId === k.id)
    if (s.length !== 1) throw new Error(s.length ? `Skor kriteria ${k.id} ganda.` : `Skor kriteria ${k.id} belum diisi.`)
    const v = s[0].nilai
    if (!Number.isFinite(v) || v < k.min || v > k.maks) throw new Error(`Skor ${k.label} harus ${k.min}–${k.maks}.`)
    total += ((v - k.min) / (k.maks - k.min)) * 100 * (k.bobot / 100)
  }
  const asing = skor.find((x) => !r.kriteria.some((k) => k.id === x.kriteriaId))
  if (asing) throw new Error(`Kriteria ${asing.kriteriaId} tidak ada di rubrik.`)
  return total
}

export function hitungNilaiPratinjau(r: Rubrik, penilaian: Pick<Penilaian, 'skor'>[], huruf: HurufMutu[], desimal: number): PratinjauNilai {
  if (penilaian.length === 0) throw new Error('Belum ada penilaian.')
  const per = penilaian.map((p) => nilaiPenguji(r, p.skor))
  const rata = per.reduce((a, b) => a + b, 0) / per.length
  const nilai = bulat(rata, desimal)
  return { perkiraan: true, nilai, huruf: hurufDari(nilai, huruf), perPenguji: per.map((v) => bulat(v, desimal)), perluKesepakatan: Math.max(...per) - Math.min(...per) > r.ambangSelisih }
}
