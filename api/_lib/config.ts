import { z } from 'zod'
import { demoGeofences } from '../../src/data/demo.js'
import { ServiceUnavailableError } from './http.js'

// Konfigurasi server. Semua rahasia hanya dari environment variable; tidak pernah dikirim ke klien.

export type SecretName = 'SESSION_SECRET' | 'QR_SECRET'

export function secret(name: SecretName): string {
  const value = process.env[name]
  if (!value || value.length < 32) throw new ServiceUnavailableError(`Server belum dikonfigurasi: ${name} belum diatur (minimal 32 karakter).`)
  return value
}

/** Umur sesi login (detik). */
export const SESSION_TTL = 8 * 60 * 60

export const isProduction = () => process.env.VERCEL_ENV === 'production'

const Geofences = z
  .array(z.object({ name: z.string().min(1), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), radius: z.number().positive().max(5000) }))
  .min(1)

export type Geofence = z.infer<typeof Geofences>[number]

/**
 * Area presensi lokasi. Isi resmi lewat env CAMPUS_GEOFENCES (JSON array {name,lat,lng,radius}).
 * TODO(LPTI): koordinat & radius resmi. Tanpa env, dipakai perkiraan dari data contoh (bukan data resmi).
 */
export function geofences(): Geofence[] {
  const raw = process.env.CAMPUS_GEOFENCES
  if (!raw) return demoGeofences
  try {
    return Geofences.parse(JSON.parse(raw))
  } catch {
    throw new ServiceUnavailableError('Server belum dikonfigurasi: CAMPUS_GEOFENCES tidak valid.')
  }
}
