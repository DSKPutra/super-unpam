import { z } from 'zod'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { issueQr, parseQrPayload, verifyCode } from '../_lib/qr.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/qr/issue?kind=KTM                       → QR KTM milik pemegang sesi
// GET  /api/qr/issue?kind=PRESENSI&subject=SESI-<MK> → QR sesi kelas (hanya dosen pengampu)
// GET  /api/qr/issue?kind=PARKIR&subject=<ID kendaraan> → QR parkir (kendaraan milik sesi & terverifikasi)
// POST /api/qr/verify { payload }                    → validasi QR KTM oleh petugas (dosen/tendik)
// KTM yang dibekukan pemiliknya tidak mendapat QR KTM/parkir dan ditolak saat diverifikasi.

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'issue') throw new HttpError(404, 'Tidak ditemukan.')
  const params = new URL(req.url).searchParams
  const kind = params.get('kind')

  if (kind === 'KTM') {
    // Subjek KTM selalu dari sesi, tidak pernah dari parameter klien.
    const s = requireSession(req)
    if (await connectors.sarpras.isKtmBeku(s.sub)) throw new HttpError(403, 'KTM sedang dibekukan.')
    return json(issueQr('KTM', s.sub))
  }

  if (kind === 'PARKIR') {
    const s = requireSession(req, ['MAHASISWA', 'DOSEN', 'TENDIK'])
    const id = /^KND-[A-Z0-9]{2,20}$/.exec(params.get('subject') ?? '')?.[0]
    if (!id) throw new HttpError(400, 'Kendaraan tidak valid.')
    const { ktmBeku, kendaraan } = await connectors.sarpras.getRingkasanParkir(s.sub)
    if (ktmBeku) throw new HttpError(403, 'KTM sedang dibekukan.')
    // Kepemilikan dicek di server: QR tidak pernah diterbitkan untuk kendaraan orang lain.
    if (kendaraan.find((k) => k.id === id)?.status !== 'terverifikasi') throw new HttpError(403, 'Kendaraan belum terverifikasi atau bukan milik Anda.')
    return json(issueQr('PARKIR', id))
  }

  if (kind === 'PRESENSI') {
    const s = requireSession(req, ['DOSEN'])
    const course = /^SESI-([A-Z0-9]{2,12})$/.exec(params.get('subject') ?? '')?.[1]
    if (!course) throw new HttpError(400, 'Sesi kelas tidak valid.')
    const teaches = (await connectors.myUnpam.getSchedule(s.sub)).some((c) => c.code === course)
    if (!teaches) throw new HttpError(403, 'Anda bukan pengampu kelas ini.')
    return json(issueQr('PRESENSI', `SESI-${course}`))
  }

  throw new HttpError(400, 'Jenis QR tidak dikenal.')
})

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'verify') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ['DOSEN', 'TENDIK'])
  rateLimit(`qr-verify:${s.sub}`, 60, 60)
  const { payload } = await readJson(req, z.object({ payload: z.string().max(200) }))
  const qr = parseQrPayload(payload)
  if (!qr || qr.kind !== 'KTM' || !verifyCode('KTM', qr.subject, qr.code, qr.slot)) return json({ valid: false })
  if (await connectors.sarpras.isKtmBeku(qr.subject)) return json({ valid: false, beku: true })
  const user = await connectors.sso.getUser(qr.subject)
  // Hanya identitas minimum untuk verifikasi tatap muka.
  return json(user ? { valid: true, name: user.name, nim: user.nim, role: user.role, prodi: user.prodi } : { valid: false })
})
