import type { SemesterGrades } from './types'

export interface IpkSummary {
  /** IPK dibulatkan 2 desimal; null bila belum ada nilai. */
  ipk: number | null
  /** IPS per semester, dari yang terlama ke terbaru (untuk sparkline). */
  history: number[]
  /** Selisih IPS terbaru terhadap semester sebelumnya; null bila < 2 semester. */
  delta: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * IPK = rata-rata IPS berbobot SKS per semester. Satu sumber untuk Beranda dan Akademik.
 * `grades` berurutan dari semester terbaru (bentuk respons MY UNPAM/BFF).
 */
export function summarizeIpk(grades: SemesterGrades[]): IpkSummary {
  const sems = grades.map((g) => ({ ips: g.ips, sks: g.courses.reduce((a, c) => a + c.sks, 0) }))
  const sks = sems.reduce((a, s) => a + s.sks, 0)
  const ipk = sks ? round2(sems.reduce((a, s) => a + s.ips * s.sks, 0) / sks) : null
  const history = sems.map((s) => s.ips).reverse()
  const delta = history.length >= 2 ? round2(history[history.length - 1] - history[history.length - 2]) : null
  return { ipk, history, delta }
}
