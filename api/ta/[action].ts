import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { transisi, type Peristiwa } from '../../src/lib/akademik/alur-skripsi.js'
import { tambahVersi, validasiEntri, VersiDitolak } from '../../src/lib/akademik/logbook.js'
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
// GET  /api/ta/logbook?taId → logbook (entri + versi draf); POST /api/ta/{entri,versi,verifikasi}
// GET  /api/ta/bimbingan     → mahasiswa bimbingan + logbook (DOSEN)
// TODO(BFF-AUTHZ): dosen hanya boleh memutuskan/memverifikasi untuk mahasiswa yang ia bimbing.

const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myUnpam') === 'mock' ? 'contoh' : 'MY UNPAM' })
const PERAN: Record<string, PeranAlur> = { MAHASISWA: 'MAHASISWA', DOSEN: 'DOSEN', TENDIK: 'PRODI' }

export const GET = handle(async (req) => {
  switch (lastSegment(req)) {
    case 'ringkasan': {
      const s = requireSession(req, ['MAHASISWA'])
      return json(wrap(await connectors.myUnpam.getRingkasanTA(s.sub)))
    }
    case 'logbook': {
      const s = requireSession(req, ['MAHASISWA', 'DOSEN'])
      const taId = new URL(req.url).searchParams.get('taId') ?? ''
      if (s.role === 'MAHASISWA') await milikSendiri(s.sub, taId)
      return json(wrap(await connectors.myUnpam.getLogbook(taId)))
    }
    case 'bimbingan': {
      const s = requireSession(req, ['DOSEN'])
      const daftar = await connectors.myUnpam.getTABimbingan(s.sub)
      return json(wrap(await Promise.all(daftar.map(async (ta) => ({ ta, logbook: await connectors.myUnpam.getLogbook(ta.id) })))))
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

async function milikSendiri(sub: string, taId: string) {
  const ta = (await connectors.myUnpam.getRingkasanTA(sub)).tugasAkhir
  if (!ta || ta.id !== taId) throw new HttpError(403, 'Bukan tugas akhir Anda.')
  return ta
}

const Entri = z.object({
  taId: z.string().max(64),
  tanggal: z.string().datetime(),
  bagian: z.string().trim().min(1).max(200),
  ringkasan: z.string().trim().max(3000),
  tugasBerikutnya: z.object({ teks: z.string().trim().min(1).max(500), tenggat: z.string().datetime().optional() }).optional(),
  versiDraf: z.number().int().positive().optional(),
})
const Versi = z.object({ taId: z.string().max(64), nama: z.string().min(1).max(200), ukuran: z.number().int().positive(), tipe: z.string().max(120), sha256: z.string(), catatan: z.string().max(1000) })
const Verifikasi = z.object({ taId: z.string().max(64), entriId: z.string().max(64), keputusan: z.enum(['DISETUJUI', 'DITOLAK']), catatan: z.string().trim().max(1000).optional() })

async function postLogbook(req: Request, aksi: string) {
  assertSameOrigin(req)
  if (aksi === 'verifikasi') {
    const s = requireSession(req, ['DOSEN'])
    const b = await readJson(req, Verifikasi)
    if (b.keputusan === 'DITOLAK' && !b.catatan) throw new HttpError(400, 'Alasan penolakan wajib diisi.')
    const lb = await connectors.myUnpam.getLogbook(b.taId)
    const e = lb.entri.find((x) => x.id === b.entriId)
    if (!e) throw new HttpError(404, 'Entri tidak ditemukan.')
    if (e.status !== 'MENUNGGU') throw new HttpError(409, 'Entri sudah diverifikasi.')
    const entri = lb.entri.map((x) => (x.id === b.entriId ? { ...x, status: b.keputusan, catatanDosen: b.catatan, diverifikasi: { oleh: s.sub, waktu: new Date().toISOString() } } : x))
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, entri })))
  }
  const s = requireSession(req, ['MAHASISWA'])
  rateLimit(`ta-logbook:${s.sub}`, 60, 3600)
  if (aksi === 'entri') {
    const b = await readJson(req, Entri)
    const ta = await milikSendiri(s.sub, b.taId)
    if (!ta.pembimbing.length) throw new HttpError(409, 'Belum ada pembimbing.')
    const g = validasiEntri(b)
    if (Object.keys(g).length) throw new HttpError(400, Object.values(g).join(' '))
    const lb = await connectors.myUnpam.getLogbook(b.taId)
    const { taId, ...isi } = b
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, entri: [...lb.entri, { ...isi, id: `bb-${randomUUID()}`, tugasAkhirId: taId, status: 'MENUNGGU' }] })))
  }
  // aksi === 'versi': metadata + hash dari klien. TODO(DrivePAM): unggah berkas ke penyimpanan dan hitung
  // ulang SHA-256 di server; sampai itu, hash belum bisa diverifikasi server.
  const b = await readJson(req, Versi)
  await milikSendiri(s.sub, b.taId)
  const lb = await connectors.myUnpam.getLogbook(b.taId)
  const { taId: _t, ...berkas } = b
  try {
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, versi: tambahVersi(lb.versi, berkas) })))
  } catch (e) {
    if (e instanceof VersiDitolak) throw new HttpError(409, e.message)
    throw e
  }
}

export const POST = handle(async (req) => {
  const aksi = lastSegment(req)
  if (['entri', 'versi', 'verifikasi'].includes(aksi)) return postLogbook(req, aksi)
  if (aksi !== 'peristiwa') throw new HttpError(404, 'Tidak ditemukan.')
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
