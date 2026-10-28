import { z } from 'zod'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/ktm/status            → { beku }
// GET  /api/ktm/log               → riwayat pemakaian KTM (gerbang, parkir, perpustakaan, presensi)
// POST /api/ktm/bekukan { beku }  → bekukan/aktifkan kembali KTM milik sesi (mis. HP hilang)

export const GET = handle(async (req) => {
  const action = lastSegment(req)
  const s = requireSession(req)
  if (action === 'status') return json({ beku: await connectors.sarpras.isKtmBeku(s.sub) })
  if (action === 'log') return json(await connectors.sarpras.getLogKtm(s.sub))
  throw new HttpError(404, 'Tidak ditemukan.')
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'bekukan') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req)
  rateLimit(`ktm-bekukan:${s.sub}`, 10, 3600)
  const { beku } = await readJson(req, z.object({ beku: z.boolean() }))
  await connectors.sarpras.setKtmBeku(s.sub, beku)
  return json({ ok: true })
})
