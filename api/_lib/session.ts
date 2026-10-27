import { randomUUID } from 'node:crypto'
import type { Role, User } from '../../src/lib/types'
import { SESSION_TTL } from './config'
import { b64url, hmac, safeEqual } from './crypto'
import { cookies, HttpError } from './http'

// Sesi = cookie HttpOnly berisi token bertanda tangan HMAC (tanpa penyimpanan server).
// __Host- memaksa Secure + Path=/ + tanpa Domain, sehingga cookie tidak bisa disetel subdomain lain.
// TODO(BFF): simpan sid di penyimpanan server (mis. Redis/KV) agar "keluar dari semua perangkat"
// dan pencabutan sesi berlaku sebelum token kedaluwarsa.

export interface Session {
  sub: string
  role: Role
  sid: string
  iat: number
  exp: number
}

const COOKIE = '__Host-su_session'

const sign = (payload: string) => b64url(hmac('SESSION_SECRET', payload))

export function createSessionCookie(user: User) {
  const now = Math.floor(Date.now() / 1000)
  const session: Session = { sub: user.nim, role: user.role, sid: randomUUID(), iat: now, exp: now + SESSION_TTL }
  const payload = b64url(JSON.stringify(session))
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
}

export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`

export function readSession(req: Request): Session | null {
  const token = cookies(req)[COOKIE]
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session
    return s.exp > Date.now() / 1000 ? s : null
  } catch {
    return null
  }
}

/** 401 bila belum masuk, 403 bila peran tidak termasuk `roles`. */
export function requireSession(req: Request, roles?: readonly Role[]): Session {
  const s = readSession(req)
  if (!s) throw new HttpError(401, 'Sesi berakhir. Silakan masuk kembali.')
  if (roles && !roles.includes(s.role)) throw new HttpError(403, 'Peran Anda tidak memiliki akses ke data ini.')
  return s
}
