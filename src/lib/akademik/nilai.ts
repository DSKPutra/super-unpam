import type { AturanAkademik, KriteriaRubrik, SkorKriteria } from './types'

export type HasilNilai =
  | { ok: true; nilai: number; huruf: string; label: 'perkiraan' }
  | { ok: false; galat: string[] }

const bulat = (n: number, desimal: number) => {
  const f = 10 ** desimal
  return Math.round((n + Number.EPSILON) * f) / f
}

/** Validasi skor terhadap rubrik: semua kriteria terisi, angka valid, dalam rentang min–max. */
export function validasiSkor(rubrik: KriteriaRubrik[], skor: SkorKriteria[]): string[] {
  const g: string[] = []
  for (const k of rubrik) {
    const s = skor.find((x) => x.kriteria === k.id)
    if (!s || !Number.isFinite(s.nilai)) g.push(`${k.nama}: belum diisi`)
    else if (s.nilai < k.min || s.nilai > k.max) g.push(`${k.nama}: ${s.nilai} di luar rentang ${k.min}–${k.max}`)
  }
  for (const s of skor) if (!rubrik.some((k) => k.id === s.kriteria)) g.push(`Kriteria tak dikenal: ${s.kriteria}`)
  return g
}

export const hurufDari = (nilai: number, a: AturanAkademik) => a.penilaian.hurufMutu.find((h) => nilai >= h.min)?.huruf ?? '?'

/**
 * Nilai PRATINJAU satu penguji (skala 0–100), selalu berlabel "perkiraan".
 * Skor tiap kriteria dinormalisasi ke 0–100 menurut min/max kriteria, lalu dirata-rata berbobot.
 * Bila total bobot ≠ 100 (seharusnya ditolak validasiAturan), bobot dinormalisasi agar tetap proporsional.
 */
export function hitungNilaiPratinjau(a: AturanAkademik, skor: SkorKriteria[]): HasilNilai {
  const rubrik = a.penilaian.rubrik
  const galat = validasiSkor(rubrik, skor)
  if (galat.length) return { ok: false, galat }
  const totalBobot = rubrik.reduce((t, k) => t + k.bobot, 0)
  if (totalBobot <= 0) return { ok: false, galat: ['Total bobot rubrik 0'] }
  const nilai = rubrik.reduce((t, k) => {
    const s = skor.find((x) => x.kriteria === k.id)!.nilai
    return t + ((s - k.min) / (k.max - k.min)) * 100 * (k.bobot / totalBobot)
  }, 0)
  const n = bulat(nilai, a.penilaian.desimal)
  return { ok: true, nilai: n, huruf: hurufDari(n, a), label: 'perkiraan' }
}

export interface GabunganPenguji {
  rata: number
  huruf: string
  selisihMaks: number
  perluRapat: boolean
  label: 'perkiraan'
}

/** Gabungkan nilai pratinjau beberapa penguji: rata-rata + penanda rapat kesepakatan. */
export function gabungPenguji(nilai: number[], a: AturanAkademik): GabunganPenguji | null {
  if (!nilai.length) return null
  const rata = bulat(nilai.reduce((t, n) => t + n, 0) / nilai.length, a.penilaian.desimal)
  const selisihMaks = bulat(Math.max(...nilai) - Math.min(...nilai), a.penilaian.desimal)
  return { rata, huruf: hurufDari(rata, a), selisihMaks, perluRapat: selisihMaks > a.penilaian.ambangSelisihPenguji, label: 'perkiraan' }
}

/** Lembar penilaian hanya terbuka dalam jendela waktu sesi (dari konfigurasi). */
export function lembarTerbuka(sesi: { mulai: string; selesai: string }, jendela: { sebelumMenit: number; sesudahMenit: number }, sekarang: Date) {
  const t = sekarang.getTime()
  return t >= new Date(sesi.mulai).getTime() - jendela.sebelumMenit * 60000 && t <= new Date(sesi.selesai).getTime() + jendela.sesudahMenit * 60000
}
