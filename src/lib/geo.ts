export interface LatLng {
  lat: number
  lng: number
}

export interface GpsLocation extends LatLng {
  accuracy?: number
}

/**
 * Filter cepat Bounding Box (derajat) sebelum kalkulasi trigonometri Haversine yang berat.
 * 1 derajat lintang ≈ 111.320 meter.
 */
export function isWithinBoundingBox(a: LatLng, center: LatLng, radiusMeters: number): boolean {
  const latDelta = radiusMeters / 111320
  if (Math.abs(a.lat - center.lat) > latDelta) return false

  const cosLat = Math.cos((center.lat * Math.PI) / 180)
  const lngDelta = radiusMeters / (111320 * Math.max(0.1, Math.abs(cosLat)))
  return Math.abs(a.lng - center.lng) <= lngDelta
}

/** Jarak haversine dalam meter. Dipakai mode demo (klien) dan validasi geofence di BFF. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Deteksi anomali koordinat dan potensi Fake GPS / Mock Location provider.
 */
export function detectGpsAnomaly(loc: GpsLocation): { isSuspicious: boolean; reason?: string } {
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
    return { isSuspicious: true, reason: 'Nilai koordinat tidak valid.' }
  }
  if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) {
    return { isSuspicious: true, reason: 'Koordinat di luar batas bola dunia.' }
  }
  // Android mock location apps umumnya mengembalikan akurasi tepat 0 atau tidak realistis
  if (loc.accuracy !== undefined) {
    if (loc.accuracy === 0) {
      return { isSuspicious: true, reason: 'Terdeteksi penyedia lokasi palsu (mock GPS accuracy 0).' }
    }
    if (loc.accuracy > 250) {
      return { isSuspicious: true, reason: 'Akurasi GPS terlalu lemah untuk validasi presensi.' }
    }
  }
  return { isSuspicious: false }
}
