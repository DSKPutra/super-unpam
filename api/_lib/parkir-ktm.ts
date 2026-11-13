import { z } from 'zod'
import { ATURAN_PARKIR } from '../../src/data/aturan-parkir.js'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, HttpError, json, readJson } from './http.js'
import { parseQrPayload, verifyCode } from './qr.js'
import { rateLimit } from './ratelimit.js'
import { requireSession } from './session.js'

// Handler parkir & KTM. Dilayani api/qr/[action].ts lewat rewrite di vercel.json
// (/api/parkir/* → /api/qr/parkir-*, /api/ktm/* → /api/qr/ktm-*) agar jumlah fungsi Vercel tetap ≤ 12.

/** Domain & aksi dari URL asli (/api/parkir/x) atau hasil rewrite (/api/qr/parkir-x). */
export function rute(req: Request): { domain: 'parkir' | 'ktm' | 'qr'; aksi: string } {
  const bagian = new URL(req.url).pathname.split('/').filter(Boolean)
  const akhir = bagian.at(-1) ?? ''
  for (const d of ['parkir', 'ktm'] as const) {
    if (bagian.at(-2) === d) return { domain: d, aksi: akhir }
    if (akhir.startsWith(d + '-')) return { domain: d, aksi: akhir.slice(d.length + 1) }
  }
  return { domain: 'qr', aksi: akhir }
}

// GET  /api/parkir/ringkasan                         → kendaraan, sesi aktif, area & riwayat milik sesi
// POST /api/parkir/kendaraan { plat, jenis, ... }     → daftarkan kendaraan (menunggu verifikasi Sarpras)
// POST /api/parkir/hapus { id }                       → hapus kendaraan milik sesi
// POST /api/parkir/gerbang { payload, arah, areaId }  → petugas gerbang (TENDIK) memindai QR parkir

const PEMILIK = ['MAHASISWA', 'DOSEN', 'TENDIK'] as const

export async function parkirGET(req: Request, action: string) {
  if (action !== 'ringkasan') throw new HttpError(404, 'Tidak ditemukan.')
  const s = requireSession(req, PEMILIK)
  return json(await connectors.sarpras.getRingkasanParkir(s.sub))
}

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

export async function parkirPOST(req: Request, action: string) {
  assertSameOrigin(req)

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
}

// GET  /api/ktm/status            → { beku }
// GET  /api/ktm/log               → riwayat pemakaian KTM (gerbang, parkir, perpustakaan, presensi)
// POST /api/ktm/bekukan { beku }  → bekukan/aktifkan kembali KTM milik sesi (mis. HP hilang)

export async function ktmGET(req: Request, action: string) {
  const s = requireSession(req)
  if (action === 'status') return json({ beku: await connectors.sarpras.isKtmBeku(s.sub) })
  if (action === 'log') return json(await connectors.sarpras.getLogKtm(s.sub))
  throw new HttpError(404, 'Tidak ditemukan.')
}

export async function ktmPOST(req: Request, action: string) {
  if (action !== 'bekukan') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req)
  rateLimit(`ktm-bekukan:${s.sub}`, 10, 3600)
  const { beku } = await readJson(req, z.object({ beku: z.boolean() }))
  await connectors.sarpras.setKtmBeku(s.sub, beku)
  return json({ ok: true })
}
