import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { transisi, type Peristiwa } from '../../src/lib/akademik/alur-skripsi.js'
import type { PeranAlur, TugasAkhir } from '../../src/lib/akademik/types.js'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/ta/ringkasan → tugas akhir pemegang sesi, dosen + kuota, judul terdaftar (MAHASISWA)
// GET  /api/ta/antrian   → pengajuan judul menunggu keputusan (DOSEN)
// POST /api/ta/peristiwa → jalankan transisi alur. Mesin status dijalankan DI SERVER dengan peran dari
//      sesi (bukan dari klien), sehingga transisi tidak sah ditolak walau klien dimodifikasi.
// TODO(BFF-AUTHZ): dosen hanya boleh memutuskan pengajuan yang memilih/ditugaskan kepadanya.

const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myUnpam') === 'mock' ? 'contoh' : 'MY UNPAM' })
const PERAN: Record<string, PeranAlur> = { MAHASISWA: 'MAHASISWA', DOSEN: 'DOSEN', TENDIK: 'PRODI' }

export const GET = handle(async (req) => {
  switch (lastSegment(req)) {
    case 'ringkasan': {
      const s = requireSession(req, ['MAHASISWA'])
      return json(wrap(await connectors.myUnpam.getRingkasanTA(s.sub)))
    }
    case 'antrian': {
      const s = requireSession(req, ['DOSEN'])
      return json(wrap(await connectors.myUnpam.getAntrianTA(s.sub)))
    }
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

const Body = z.object({
  taId: z.string().max(64).optional(),
  peristiwa: z.enum(['AJUKAN_JUDUL', 'SETUJUI_JUDUL', 'TOLAK_JUDUL', 'AJUKAN_ULANG', 'MULAI_BIMBINGAN']),
  catatan: z.string().trim().max(1000).optional(),
  pembimbing: z.array(z.string().max(64)).max(3).optional(),
  judul: z.object({ judul: z.string().trim().min(1).max(300), bidang: z.string().max(120), abstrak: z.string().max(3000), metode: z.string().max(3000), pilihanPembimbing: z.array(z.string().max(64)).max(5) }).optional(),
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'peristiwa') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ['MAHASISWA', 'DOSEN', 'TENDIK'])
  rateLimit(`ta:${s.sub}`, 30, 3600)
  const b = await readJson(req, Body)
  const pelaku = PERAN[s.role]

  let ta: TugasAkhir | null = b.taId ? await connectors.myUnpam.getTA(b.taId) : (await connectors.myUnpam.getRingkasanTA(s.sub)).tugasAkhir
  if (!ta && b.peristiwa === 'AJUKAN_JUDUL' && pelaku === 'MAHASISWA')
    ta = { id: `ta-${randomUUID()}`, judul: '', abstrak: '', bidang: '', metode: '', pilihanPembimbing: [], pembimbing: [], status: 'DRAF_JUDUL', riwayat: [], perubahan: [] }
  if (!ta) throw new HttpError(404, 'Tugas akhir tidak ditemukan.')
  if (b.judul && pelaku === 'MAHASISWA' && ta.status === 'DRAF_JUDUL') ta = { ...ta, ...b.judul }

  const r = transisi(ta, b.peristiwa as Peristiwa, { pelaku, catatan: b.catatan, pembimbing: b.pembimbing })
  if (!r.ok) throw new HttpError(409, r.galat)
  return json(wrap(await connectors.myUnpam.simpanTA(s.sub, r.ta)))
})
