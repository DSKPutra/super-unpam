import type { SemesterGrades } from './types'

export interface IpkSummary {
  /** IPK dibulatkan 2 desimal; null bila belum ada nilai. */
  ipk: number | null
  /** IPS per semester, dari yang terlama ke terbaru (untuk sparkline). */
  history: number[]
  /** Selisih IPS terbaru terhadap semester sebelumnya; null bila < 2 semester. */
  delta: number | null
}

export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  'A-': 3.75,
  'B+': 3.25,
  B: 3.0,
  'B-': 2.75,
  'C+': 2.25,
  C: 2.0,
  D: 1.0,
  E: 0.0,
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

export interface PlannedCourse {
  sks: number
  grade: string
}

/**
 * Simulasi proyeksi IPK kumulatif jika mahasiswa memperoleh nilai tertentu
 * pada mata kuliah yang sedang/akan diambil.
 */
export function calculateProjectedIpk(currentGrades: SemesterGrades[], planned: PlannedCourse[]): number {
  const currentSems = currentGrades.map((g) => ({ ips: g.ips, sks: g.courses.reduce((a, c) => a + c.sks, 0) }))
  const currentTotalSks = currentSems.reduce((a, s) => a + s.sks, 0)
  const currentQualityPoints = currentSems.reduce((a, s) => a + s.ips * s.sks, 0)

  const plannedSks = planned.reduce((a, p) => a + p.sks, 0)
  const plannedQualityPoints = planned.reduce((a, p) => a + (GRADE_POINTS[p.grade] ?? 0) * p.sks, 0)

  const totalSks = currentTotalSks + plannedSks
  if (totalSks === 0) return 0
  return round2((currentQualityPoints + plannedQualityPoints) / totalSks)
}

export interface TargetIpsResult {
  feasible: boolean
  requiredIps: number
  maxAchievableIpk: number
}

/**
 * Menghitung IPS minimal yang harus dicapai pada sisa SKS untuk meraih target IPK tertentu.
 */
export function calculateRequiredIps(currentGrades: SemesterGrades[], targetIpk: number, remainingSks: number): TargetIpsResult {
  const currentSems = currentGrades.map((g) => ({ ips: g.ips, sks: g.courses.reduce((a, c) => a + c.sks, 0) }))
  const currentTotalSks = currentSems.reduce((a, s) => a + s.sks, 0)
  const currentQualityPoints = currentSems.reduce((a, s) => a + s.ips * s.sks, 0)

  const totalSks = currentTotalSks + remainingSks
  const maxAchievableIpk = totalSks ? round2((currentQualityPoints + 4.0 * remainingSks) / totalSks) : 4.0

  if (remainingSks <= 0) {
    const currentIpk = currentTotalSks ? round2(currentQualityPoints / currentTotalSks) : 0
    return {
      feasible: currentIpk >= targetIpk,
      requiredIps: 0,
      maxAchievableIpk: currentIpk,
    }
  }

  // targetIpk = (currentQualityPoints + reqIps * remainingSks) / totalSks
  const requiredPoints = targetIpk * totalSks - currentQualityPoints
  const rawIps = requiredPoints / remainingSks
  const requiredIps = Math.max(0, round2(rawIps))

  return {
    feasible: requiredIps <= 4.0,
    requiredIps,
    maxAchievableIpk,
  }
}

/**
 * Parser format rentang jam kuliah (misal: "08:00 - 10:30" atau "08:00-10:30").
 * Mengembalikan menit dari jam 00:00 untuk perbandingan matematis.
 */
export function parseTimeRange(timeStr?: string): { start: number; end: number } | null {
  if (!timeStr) return null
  const parts = timeStr.split(/[-–]/).map((s) => s.trim())
  if (parts.length < 2) return null

  const parseMinutes = (val: string) => {
    const [hh, mm] = val.split(':').map(Number)
    if (isNaN(hh) || isNaN(mm)) return null
    return hh * 60 + mm
  }

  const start = parseMinutes(parts[0])
  const end = parseMinutes(parts[1])
  if (start === null || end === null || start >= end) return null
  return { start, end }
}

export interface Schedulable {
  code: string
  name: string
  day?: string
  time?: string
}

export interface ConflictResult<T> {
  courseA: T
  courseB: T
  message: string
}

/**
 * Deteksi tabrakan jadwal kuliah (hari yang sama dengan rentang waktu beririsan).
 */
export function findScheduleConflicts<T extends Schedulable>(courses: T[]): ConflictResult<T>[] {
  const conflicts: ConflictResult<T>[] = []

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i]
      const b = courses[j]

      if (!a.day || !b.day || a.day.trim().toLowerCase() !== b.day.trim().toLowerCase()) {
        continue
      }

      const rangeA = parseTimeRange(a.time)
      const rangeB = parseTimeRange(b.time)
      if (!rangeA || !rangeB) continue

      // Beririsan jika max(startA, startB) < min(endA, endB)
      const overlap = Math.max(rangeA.start, rangeB.start) < Math.min(rangeA.end, rangeB.end)
      if (overlap) {
        conflicts.push({
          courseA: a,
          courseB: b,
          message: `Bentrok di hari ${a.day}: ${a.name} (${a.time}) bertabrakan dengan ${b.name} (${b.time})`,
        })
      }
    }
  }

  return conflicts
}
