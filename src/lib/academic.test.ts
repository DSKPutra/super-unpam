import { describe, expect, it } from 'vitest'
import {
  calculateProjectedIpk,
  calculateRequiredIps,
  findScheduleConflicts,
  parseTimeRange,
  summarizeIpk,
} from './academic'
import type { SemesterGrades } from './types'

const sem = (ips: number, sks: number[]): SemesterGrades => ({
  semester: `IPS ${ips}`,
  ips,
  courses: sks.map((n, i) => ({ code: `MK${i}`, name: `MK ${i}`, sks: n, grade: 'A' })),
})

describe('summarizeIpk', () => {
  it('rata-rata IPS berbobot SKS, data terbaru di depan', () => {
    const out = summarizeIpk([sem(3.72, [3, 3, 3, 2, 2]), sem(3.6, [3, 3, 3, 2])])
    expect(out.ipk).toBe(3.67)
    expect(out.history).toEqual([3.6, 3.72])
    expect(out.delta).toBe(0.12)
  })

  it('tanpa nilai menghasilkan null', () => {
    expect(summarizeIpk([])).toEqual({ ipk: null, history: [], delta: null })
  })

  it('satu semester: IPK = IPS, tanpa delta', () => {
    expect(summarizeIpk([sem(3.5, [3, 3])])).toEqual({ ipk: 3.5, history: [3.5], delta: null })
  })

  it('delta negatif saat IPS turun', () => {
    expect(summarizeIpk([sem(3.0, [3]), sem(3.5, [3])]).delta).toBe(-0.5)
  })
})

describe('calculateProjectedIpk', () => {
  it('menghitung simulasi IPK kumulatif baru dengan benar', () => {
    // 20 SKS sebelumnya dengan IPK 3.00 (60 poin mutu)
    const current = [sem(3.0, [20])]
    // Rencana ambil 10 SKS dengan nilai A (4.00) -> 40 poin mutu -> total 100 poin / 30 SKS = 3.33
    const projected = calculateProjectedIpk(current, [{ sks: 10, grade: 'A' }])
    expect(projected).toBe(3.33)
  })
})

describe('calculateRequiredIps', () => {
  it('menghitung target IPS yang realistis', () => {
    // Saat ini 60 SKS dengan IPK 3.20 (192 poin mutu)
    // Ingin target IPK 3.40 dengan 20 SKS sisa (total 80 SKS, butuh 272 poin -> butuh 80 poin / 20 SKS = 4.00)
    const res = calculateRequiredIps([sem(3.2, [60])], 3.4, 20)
    expect(res.feasible).toBe(true)
    expect(res.requiredIps).toBe(4.0)
  })

  it('menandai tidak layak bila target melampaui batas maksimal 4.00', () => {
    // Saat ini 100 SKS dengan IPK 2.50
    // Target 3.80 dengan sisa 10 SKS -> mustahil
    const res = calculateRequiredIps([sem(2.5, [100])], 3.8, 10)
    expect(res.feasible).toBe(false)
    expect(res.requiredIps).toBeGreaterThan(4.0)
  })
})

describe('parseTimeRange & findScheduleConflicts', () => {
  it('mengurai format jam dengan tepat', () => {
    expect(parseTimeRange('08:00 - 10:30')).toEqual({ start: 480, end: 630 })
    expect(parseTimeRange('invalid')).toBeNull()
  })

  it('mendeteksi bentrok jadwal di hari yang sama dengan jam beririsan', () => {
    const list = [
      { code: 'TIF101', name: 'Pemrograman Web', day: 'Senin', time: '08:00 - 10:30' },
      { code: 'TIF102', name: 'Kecerdasan Buatan', day: 'Senin', time: '09:00 - 11:30' },
    ]
    const conflicts = findScheduleConflicts(list)
    expect(conflicts.length).toBe(1)
    expect(conflicts[0].message).toContain('Bentrok di hari Senin')
  })

  it('tidak mendeteksi bentrok jika jam berbeda atau hari berbeda', () => {
    const list = [
      { code: 'TIF101', name: 'Pemrograman Web', day: 'Senin', time: '08:00 - 10:00' },
      { code: 'TIF102', name: 'Basis Data', day: 'Senin', time: '10:00 - 12:00' },
      { code: 'TIF103', name: 'Jaringan', day: 'Selasa', time: '08:00 - 10:00' },
    ]
    expect(findScheduleConflicts(list).length).toBe(0)
  })
})
