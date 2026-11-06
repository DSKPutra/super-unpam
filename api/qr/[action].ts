import { z } from 'zod'
import { connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { safeEqual } from '../_lib/crypto.js'
import { issueQr, pakaiSekali, parseQrPayload, samarkan, verifyCode } from '../_lib/qr.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/qr/issue?kind=KTM                       → QR KTM milik pemegang sesi
// GET  /api/qr/issue?kind=GERBANG                   → QR gerbang keluar milik pemegang sesi
// POST /api/qr/gerbang { payload, jalur }           → validator gerbang (header x-gerbang-key); QR sekali pakai
// GET  /api/qr/issue?kind=PRESENSI&subject=SESI-<MK> → QR sesi kelas (hanya dosen pengampu)
// POST /api/qr/verify { payload }                    → validasi QR KTM oleh petugas (dosen/tendik)

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'issue') throw new HttpError(404, 'Tidak ditemukan.')
  const params = new URL(req.url).searchParams
  const kind = params.get('kind')

  if (kind === 'KTM') {
    // Subjek KTM selalu dari sesi, tidak pernah dari parameter klien.
    const s = requireSession(req)
    return json(issueQr('KTM', s.sub))
  }

  if (kind === 'GERBANG') {
    // QR gerbang keluar milik pemegang sesi (semua peran yang keluar-masuk kampus).
    const s = requireSession(req)
    return json(issueQr('GERBANG', s.sub))
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

/** POST /api/qr/gerbang — dipanggil validator di gerbang (bukan browser), dengan header x-gerbang-key. */
async function postGerbang(req: Request) {
  const kunci = process.env.GERBANG_API_KEY
  if (!kunci || kunci.length < 32) throw new HttpError(503, 'Integrasi gerbang belum dikonfigurasi.')
  if (!safeEqual(req.headers.get('x-gerbang-key') ?? '', kunci)) throw new HttpError(401, 'Kunci gerbang tidak valid.')
  const { payload, jalur } = await readJson(req, z.object({ payload: z.string().max(200), jalur: z.number().int().min(1).max(20) }))
  rateLimit(`gerbang:${jalur}`, 1200, 60)
  const qr = parseQrPayload(payload)
  if (!qr || qr.kind !== 'GERBANG' || !verifyCode('GERBANG', qr.subject, qr.code, qr.slot)) return json({ buka: false, alasan: 'QR tidak valid atau kedaluwarsa.' })
  if (!pakaiSekali('GERBANG', qr.subject, qr.slot)) return json({ buka: false, alasan: 'QR sudah dipakai. Minta pemilik menampilkan QR terbaru.' })
  // TODO(BFF): catat log gerbang (NIM tersamar, jalur, waktu) ke penyimpanan kampus; tanpa foto/video.
  return json({ buka: true, nim: samarkan(qr.subject), jalur })
}

export const POST = handle(async (req) => {
  if (lastSegment(req) === 'gerbang') return postGerbang(req)
  if (lastSegment(req) !== 'verify') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ['DOSEN', 'TENDIK'])
  rateLimit(`qr-verify:${s.sub}`, 60, 60)
  const { payload } = await readJson(req, z.object({ payload: z.string().max(200) }))
  const qr = parseQrPayload(payload)
  if (!qr || qr.kind !== 'KTM' || !verifyCode('KTM', qr.subject, qr.code, qr.slot)) return json({ valid: false })
  const user = await connectors.sso.getUser(qr.subject)
  // Hanya identitas minimum untuk verifikasi tatap muka.
  return json(user ? { valid: true, name: user.name, nim: user.nim, role: user.role, prodi: user.prodi } : { valid: false })
})
