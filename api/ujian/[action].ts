import { z } from 'zod'
import { JENIS_UJIAN_SEMESTER } from '../../src/lib/akademik/types.js'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/ujian/jadwal?jenis=UTS|UAS|SUSULAN|REMEDIAL → jadwal + ID kartu pemegang sesi
// GET  /api/ujian/kelayakan                          → data kelayakan (kehadiran, keuangan, …)
// GET  /api/ujian/pengajuan                          → pengajuan susulan/remedial
// POST /api/ujian/pengajuan                          → ajukan susulan/remedial (metadata lampiran saja;
//      berkas bukti menunggu layanan penyimpanan/DrivePAM)
// Keputusan kelayakan resmi tetap di server/MY UNPAM; klien hanya menampilkan.

const ROLES = ['MAHASISWA'] as const
const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myUnpam') === 'mock' ? 'contoh' : 'MY UNPAM' })

export const GET = handle(async (req) => {
  const s = requireSession(req, ROLES)
  switch (lastSegment(req)) {
    case 'jadwal': {
      const jenis = z.enum(JENIS_UJIAN_SEMESTER).safeParse(new URL(req.url).searchParams.get('jenis'))
      if (!jenis.success) throw new HttpError(400, 'Jenis ujian tidak dikenal.')
      return json(wrap(await connectors.myUnpam.getUjian(s.sub, jenis.data)))
    }
    case 'kelayakan':
      return json(wrap(await connectors.myUnpam.getProfilKelayakan(s.sub)))
    case 'pengajuan':
      return json(wrap(await connectors.myUnpam.getPengajuanUjian(s.sub)))
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

const Pengajuan = z.object({
  jenis: z.enum(['SUSULAN', 'REMEDIAL']),
  kodeMK: z.string().regex(/^[A-Z0-9]{2,12}$/),
  namaMK: z.string().min(1).max(120),
  alasan: z.string().trim().min(10).max(1000),
  lampiran: z.array(z.object({ nama: z.string().min(1).max(200), ukuran: z.number().int().nonnegative(), tipe: z.string().max(100) })).max(5),
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'pengajuan') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  rateLimit(`ujian-pengajuan:${s.sub}`, 10, 3600)
  const input = await readJson(req, Pengajuan)
  return json(wrap(await connectors.myUnpam.ajukanUjian(s.sub, input)))
})
