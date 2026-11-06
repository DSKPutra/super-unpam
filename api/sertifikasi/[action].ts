import { z } from 'zod'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/sertifikasi/ringkasan → skema, uji kompetensi, sertifikat terbit (MY LSP)
// POST /api/sertifikasi/daftar    { skemaId } → daftar uji kompetensi

const ROLES = ['MAHASISWA', 'ALUMNI'] as const
const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myLsp') === 'mock' ? 'contoh' : 'MyLSP' })

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'ringkasan') throw new HttpError(404, 'Tidak ditemukan.')
  const s = requireSession(req, ROLES)
  return json(wrap(await connectors.myLsp.getRingkasan(s.sub)))
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'daftar') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  rateLimit(`lsp-daftar:${s.sub}`, 10, 60)
  const { skemaId } = await readJson(req, z.object({ skemaId: z.string().regex(/^[\w-]{1,40}$/) }))
  return json(wrap(await connectors.myLsp.daftarSkema(s.sub, skemaId)))
})
