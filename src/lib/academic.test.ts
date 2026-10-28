import { describe, expect, it } from 'vitest'
import { summarizeIpk } from './academic'
import type { SemesterGrades } from './types'

const sem = (ips: number, sks: number[]): SemesterGrades => ({
  semester: `IPS ${ips}`,
  ips,
  courses: sks.map((n, i) => ({ code: `MK${i}`, name: `MK ${i}`, sks: n, grade: 'A' })),
})

describe('summarizeIpk', () => {
  it('rata-rata IPS berbobot SKS, data terbaru di depan', () => {
    // Bentuk data contoh: 13 SKS @3.72 dan 11 SKS @3.60 → 3.665 → 3.67
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
