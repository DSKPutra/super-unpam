import { createHmac, timingSafeEqual } from 'node:crypto'
import { secret, type SecretName } from './config.js'

export const hmac = (key: SecretName, data: string) => createHmac('sha256', secret(key)).update(data).digest()

export const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url')

/** Perbandingan waktu-konstan agar tanda tangan tidak bisa ditebak lewat timing. */
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
