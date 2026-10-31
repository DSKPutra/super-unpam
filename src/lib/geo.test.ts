import { describe, expect, it } from 'vitest'
import { detectGpsAnomaly, distanceMeters, isWithinBoundingBox } from './geo'

describe('geo - distanceMeters & isWithinBoundingBox', () => {
  // Kampus Viktor UNPAM (-6.3468, 106.6915)
  const viktor = { lat: -6.3468, lng: 106.6915 }

  it('menghitung jarak 0 untuk titik yang sama', () => {
    expect(Math.round(distanceMeters(viktor, viktor))).toBe(0)
    expect(isWithinBoundingBox(viktor, viktor, 50)).toBe(true)
  })

  it('bounding box menyaring titik yang jelas-jelas jauh tanpa komputasi berat', () => {
    const jakartaPusat = { lat: -6.1751, lng: 106.865 }
    expect(isWithinBoundingBox(jakartaPusat, viktor, 500)).toBe(false)
  })

  it('akurasi jarak haversine pada jarak dekat (±100m)', () => {
    // Geser sedikit lintang ~111m
    const near = { lat: -6.3458, lng: 106.6915 }
    const dist = distanceMeters(viktor, near)
    expect(dist).toBeGreaterThan(100)
    expect(dist).toBeLessThan(120)
    expect(isWithinBoundingBox(near, viktor, 150)).toBe(true)
  })
})

describe('geo - detectGpsAnomaly', () => {
  it('lolos untuk koordinat GPS nyata dengan akurasi wajar', () => {
    const res = detectGpsAnomaly({ lat: -6.3468, lng: 106.6915, accuracy: 12 })
    expect(res.isSuspicious).toBe(false)
  })

  it('mendeteksi mock GPS dengan akurasi tepat 0', () => {
    const res = detectGpsAnomaly({ lat: -6.3468, lng: 106.6915, accuracy: 0 })
    expect(res.isSuspicious).toBe(true)
    expect(res.reason).toContain('mock GPS')
  })

  it('menolak koordinat non-finite atau di luar batas dunia', () => {
    expect(detectGpsAnomaly({ lat: NaN, lng: 106 }).isSuspicious).toBe(true)
    expect(detectGpsAnomaly({ lat: 100, lng: 106 }).isSuspicious).toBe(true)
  })

  it('mendeteksi sinyal terlalu lemah (>250m)', () => {
    const res = detectGpsAnomaly({ lat: -6.3468, lng: 106.6915, accuracy: 300 })
    expect(res.isSuspicious).toBe(true)
    expect(res.reason).toContain('terlalu lemah')
  })
})
