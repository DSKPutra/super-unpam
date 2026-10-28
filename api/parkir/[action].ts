import { z } from 'zod'
import { ATURAN_PARKIR } from '../../src/data/aturan-parkir.js'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { parseQrPayload, verifyCode } from '../_lib/qr.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/parkir/ringkasan                         → kendaraan, sesi aktif, area & riwayat milik sesi
// POST /api/parkir/kendaraan { plat, jenis, ... }     → daftarkan kendaraan (menunggu verifikasi Sarpras)
// POST /api/parkir/hapus { id }                       → hapus kendaraan milik sesi
// POST /api/parkir/gerbang { payload, arah, areaId }  → petugas gerbang (TENDIK) memindai QR parkir

const PEMILIK = ['MAHASISWA', 'DOSEN', 'TENDIK'] as const

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'ringkasan') throw new HttpError(404, 'Tidak ditemukan.')
  const s = requireSession(req, PEMILIK)
  return json(await connectors.sarpras.getRingkasanParkir(s.sub))
})

const Kendaraan = z.object({
  plat: z.string().max(16),
  jenis: z.enum(['motor', 'mobil']),
  merek: z.string().max(40),
  warna: z.string().max(20),
  // Metadata STNK; berkasnya sendiri diunggah ke penyimpanan Sarpras. TODO(Sarpras): alur unggah berkas asli.
  stnk: z.object({ nama: z.string().max(80), ukuran: z.number().int().nonnegative(), tipe: z.string().max(60) }).optional(),
})
const Gerbang = z.object({
  payload: z.string().max(200),
  arah: z.enum(['masuk', 'keluar']),
  areaId: z.string().refine((id) => ATURAN_PARKIR.area.some((a) => a.id === id), 'Area tidak dikenal.'),
})

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const action = lastSegment(req)

  if (action === 'kendaraan') {
    const s = requireSession(req, PEMILIK)
    rateLimit(`parkir-daftar:${s.sub}`, 10, 3600)
    return json(await connectors.sarpras.daftarKendaraan(s.sub, await readJson(req, Kendaraan)))
  }

  if (action === 'hapus') {
    const s = requireSession(req, PEMILIK)
    const { id } = await readJson(req, z.object({ id: z.string().regex(/^KND-[A-Z0-9]{2,20}$/) }))
    await connectors.sarpras.hapusKendaraan(s.sub, id)
    return json({ ok: true })
  }

  if (action === 'gerbang') {
    // TODO(Sarpras): akun khusus petugas parkir; sementara semua TENDIK dianggap petugas.
    const s = requireSession(req, ['TENDIK'])
    rateLimit(`parkir-gerbang:${s.sub}`, 120, 60)
    const body = await readJson(req, Gerbang)
    const qr = parseQrPayload(body.payload)
    if (!qr || qr.kind !== 'PARKIR' || !verifyCode('PARKIR', qr.subject, qr.code, qr.slot))
      return json({ ok: false, alasan: 'QR parkir tidak valid atau kedaluwarsa. Minta pemilik membuka QR terbaru.' })
    const pemilik = await connectors.sarpras.getPemilikKendaraan(qr.subject)
    if (!pemilik) return json({ ok: false, alasan: 'Kendaraan tidak terdaftar.' })
    const hasil = await connectors.sarpras.catatGerbang(pemilik, qr.subject, body.arah, body.areaId)
    // Nama pemilik ditampilkan agar petugas bisa mencocokkan wajah/plat; NIM tidak dikirim.
    const nama = (await connectors.sso.getUser(pemilik))?.name
    return json({ ...hasil, pemilik: nama })
  }

  throw new HttpError(404, 'Tidak ditemukan.')
})
