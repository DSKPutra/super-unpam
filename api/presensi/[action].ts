import { z } from 'zod'
import { distanceMeters } from '../../src/lib/geo'
import type { CheckInResult } from '../../src/lib/types'
import { connectors } from '../_connectors'
import { geofences } from '../_lib/config'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http'
import { parseQrPayload, verifyCode } from '../_lib/qr'
import { rateLimit } from '../_lib/ratelimit'
import { requireSession } from '../_lib/session'

// GET  /api/presensi/campuses → nama & radius area presensi (tanpa koordinat)
// POST /api/presensi/checkin  → validasi QR / kode sesi / geofence di server, lalu catat ke MY UNPAM

const ROLES = ['MAHASISWA', 'TENDIK'] as const

export const GET = handle(async (req) => {
  if (lastSegment(req) !== 'campuses') throw new HttpError(404, 'Tidak ditemukan.')
  requireSession(req)
  return json(geofences().map(({ name, radius }) => ({ name, radius })))
})

const CheckIn = z.discriminatedUnion('method', [
  z.object({ method: z.literal('qr'), payload: z.string().max(200) }),
  z.object({ method: z.literal('kode'), course: z.string().regex(/^[A-Z0-9]{2,12}$/), code: z.string().regex(/^[A-Z0-9]{6,7}$/) }),
  z.object({ method: z.literal('gps'), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().nonnegative().optional() }),
])

/** Akurasi GPS terburuk yang masih diterima (meter). */
const MAX_ACCURACY = 150

export const POST = handle(async (req) => {
  if (lastSegment(req) !== 'checkin') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  // Kode sesi hanya 7 karakter: batasi percobaan agar tidak bisa ditebak.
  rateLimit(`checkin:${s.sub}`, 10, 60)
  const body = await readJson(req, CheckIn)
  const schedule = await connectors.myUnpam.getSchedule(s.sub)
  const enrolled = (code: string) => {
    const c = schedule.find((x) => x.code === code)
    if (!c) throw new HttpError(403, 'Anda tidak terdaftar di kelas ini.')
    return c
  }

  let course
  let method: string
  if (body.method === 'qr') {
    const qr = parseQrPayload(body.payload)
    if (!qr || qr.kind !== 'PRESENSI' || !verifyCode('PRESENSI', qr.subject, qr.code, qr.slot)) throw new HttpError(422, 'QR tidak valid atau sudah kedaluwarsa. Pindai ulang QR terbaru dari dosen.')
    course = enrolled(qr.subject.replace(/^SESI-/, ''))
    method = 'Scan QR dosen'
  } else if (body.method === 'kode') {
    course = enrolled(body.course)
    if (!verifyCode('PRESENSI', `SESI-${course.code}`, body.code)) throw new HttpError(422, 'Kode sesi salah atau sudah kedaluwarsa.')
    method = 'Kode sesi'
  } else {
    // Catatan: koordinat dikirim perangkat dan bisa dipalsukan; geofence server perlu, tapi tidak cukup sendirian.
    if (body.accuracy !== undefined && body.accuracy > MAX_ACCURACY) throw new HttpError(422, `Akurasi lokasi terlalu rendah (±${Math.round(body.accuracy)} m). Coba di area terbuka atau gunakan QR/kode.`)
    const best = geofences()
      .map((g) => ({ ...g, d: distanceMeters(body, g) }))
      .sort((a, b) => a.d - b.d)[0]
    if (best.d > best.radius) throw new HttpError(422, `Anda berada ±${(best.d / 1000).toFixed(1)} km dari ${best.name}. Presensi lokasi hanya bisa di area kampus.`)
    // TODO(MY UNPAM): tentukan sesi berjalan dari jadwal + jam server; sementara sesi pertama hari ini.
    course = schedule[0]
    if (!course) throw new HttpError(422, 'Tidak ada sesi kuliah yang sedang berlangsung.')
    method = `Lokasi · ${best.name}`
  }

  await connectors.myUnpam.recordAttendance(s.sub, course.code, body.method)
  const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date())
  return json({ course: course.name, method, time } satisfies CheckInResult)
})
