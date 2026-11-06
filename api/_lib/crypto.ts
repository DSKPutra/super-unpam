import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { secret, type SecretName } from './config.js'

export const hmac = (key: SecretName, data: string) => createHmac('sha256', secret(key)).update(data).digest()

export const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url')

/**
 * Perbandingan waktu-konstan tahan terhadap kebocoran panjang (length-leakage resistant).
 * Menggunakan digest SHA-256 untuk memetakan kedua masukan ke ukuran tepat 32-byte,
 * sehingga perbandingan waktu timingSafeEqual selalu berjalan dalam waktu konstan
 * terlepas dari perbedaan panjang string masukan.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb) && a === b
}
