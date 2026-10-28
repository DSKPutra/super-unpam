import { z } from 'zod'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, clientIp, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { clearSessionCookie, createSessionCookie, requireSession } from '../_lib/session.js'

// POST /api/auth/login · POST /api/auth/logout · GET /api/auth/me

const LoginBody = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

export const POST = handle(async (req) => {
  const action = lastSegment(req)
  assertSameOrigin(req)

  if (action === 'login') {
    const { username, password } = await readJson(req, LoginBody)
    rateLimit(`login:ip:${clientIp(req)}`, 20, 15 * 60)
    rateLimit(`login:user:${username.toLowerCase()}`, 5, 15 * 60)
    const user = await connectors.sso.authenticate(username, password)
    if (!user) throw new HttpError(401, 'NIM/email atau kata sandi salah.')
    return json(user, 200, { 'Set-Cookie': createSessionCookie(user) })
  }

  if (action === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() })

  throw new HttpError(404, 'Tidak ditemukan.')
})

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'me') throw new HttpError(404, 'Tidak ditemukan.')
  const session = requireSession(req)
  const user = await connectors.sso.getUser(session.sub)
  if (!user) throw new HttpError(401, 'Sesi tidak valid. Silakan masuk kembali.')
  return json(user)
})
