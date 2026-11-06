import { z } from 'zod'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/toefl/jadwal      → jadwal tes MY LB
// GET  /api/toefl/ringkasan   → hasil, pendaftaran, target skor pemegang sesi
// POST /api/toefl/daftar      { jadwalId } → daftar tes (tagihan dibuat MY LB/SISKEMU)
// Kredensial MY LB tidak pernah ke klien: BFF memanggil MY LB atas nama sesi.

const ROLES = ['MAHASISWA', 'ALUMNI'] as const
const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myLb') === 'mock' ? 'contoh' : 'MyLB' })

export const GET = handle(async (req) => {
  const s = requireSession(req, ROLES)
  switch (lastSegment(req)) {
    case 'jadwal':
      return json(wrap(await connectors.myLb.getJadwal(s.sub)))
    case 'ringkasan':
      return json(wrap(await connectors.myLb.getRingkasan(s.sub)))
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'daftar') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  rateLimit(`toefl-daftar:${s.sub}`, 10, 60)
  const { jadwalId } = await readJson(req, z.object({ jadwalId: z.string().regex(/^[\w-]{1,40}$/) }))
  return json(wrap(await connectors.myLb.daftarTes(s.sub, jadwalId)))
})
