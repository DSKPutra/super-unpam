import type {
  AppNotification,
  AttendanceRecap,
  Bill,
  CampusArea,
  CampusEvent,
  Certification,
  CheckInRequest,
  CheckInResult,
  KrsClass,
  NewsItem,
  OnlineClass,
  QrKind,
  QrToken,
  Ranking,
  ScheduleItem,
  SemesterGrades,
  Task,
  ToeflSummary,
  User,
} from './types'
import { distanceMeters } from './geo'

/**
 * Adapter data Super UNPAM: SATU-SATUNYA pintu halaman ke data.
 * - VITE_USE_DEMO tidak di-set / 'true' → data contoh (src/data/demo.ts, dimuat sebagai chunk terpisah).
 * - VITE_USE_DEMO='false' → memanggil BFF di /api/... (Vercel Functions, sesi cookie HttpOnly).
 * Halaman tidak perlu tahu sumbernya; mengganti sumber tidak mengubah UI.
 */
export const USE_DEMO = import.meta.env.VITE_USE_DEMO !== 'false'

const demo = () => import('../data/demo')
type Demo = Awaited<ReturnType<typeof demo>>

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Dipancarkan saat BFF menjawab 401: App kembali ke layar masuk. */
export const UNAUTHORIZED_EVENT = 'superunpam:unauthorized'

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    })
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('auth/')) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(res.status, body?.error ?? `Permintaan gagal (${res.status}).`)
  }
  return body as T
}

const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) })

const resource =
  <T>(fromDemo: (d: Demo) => T, path: string) =>
  (): Promise<T> =>
    USE_DEMO ? demo().then(fromDemo) : request<T>(path)

// — Akademik (MY UNPAM)
export const getSchedule = resource<ScheduleItem[]>((d) => d.schedule, 'academic/schedule')
export const getGrades = resource<SemesterGrades[]>((d) => d.grades, 'academic/grades')
export const getKrsOffer = resource<KrsClass[]>((d) => d.krsOffer, 'academic/krs')
export const getAttendanceRecap = resource<AttendanceRecap[]>((d) => d.attendanceRecap, 'academic/attendance')
// — Kuliah online (MENTARI)
export const getClasses = resource<OnlineClass[]>((d) => d.classes, 'kuliah/classes')
export const getTasks = resource<Task[]>((d) => d.tasks, 'kuliah/tasks')
// — Keuangan (SISKEMU)
export const getBills = resource<Bill[]>((d) => d.bills, 'finance/bills')
// — Layanan kampus (EMS, MY LSP, MY LB, SISPEMA, portal)
export const getEvents = resource<CampusEvent[]>((d) => d.events, 'campus/events')
export const getCertifications = resource<Certification[]>((d) => d.certifications, 'campus/certifications')
export const getToefl = resource<ToeflSummary>((d) => d.toefl, 'campus/toefl')
export const getRanking = resource<Ranking>((d) => d.ranking, 'campus/ranking')
export const getNews = resource<NewsItem[]>((d) => d.news, 'campus/news')
export const getNotifications = resource<AppNotification[]>((d) => d.notifications, 'campus/notifications')
// — Presensi
export const getCampusAreas = resource<CampusArea[]>((d) => d.demoGeofences.map(({ name, radius }) => ({ name, radius })), 'presensi/campuses')

// — Autentikasi
export async function login(username: string, password: string): Promise<User> {
  if (!USE_DEMO) return post<User>('auth/login', { username, password })
  // Simulasi: terima NIM/NIDN/email + password minimal 6 karakter.
  await new Promise((r) => setTimeout(r, 500))
  if (!username.trim() || password.length < 6) throw new ApiError(401, 'NIM/email atau kata sandi salah.')
  return (await demo()).DEMO_USER
}

/** Status sesi yang sebenarnya; di mode BFF berasal dari /api/auth/me (cookie HttpOnly). */
export const currentUser = resource<User>((d) => d.DEMO_USER, 'auth/me')

export async function logout() {
  if (!USE_DEMO) await post('auth/logout', {}).catch(() => undefined)
  // Respons /api yang di-cache service worker berisi data pribadi: hapus saat keluar.
  await globalThis.caches?.delete('api').catch(() => undefined)
}

// — QR dinamis (KTM & sesi presensi)
export const QR_PERIOD = 30

/** Mode demo saja: kode dihitung di klien dan TIDAK aman. Mode BFF: kode HMAC dari server. */
function demoCode(subject: string, slot: number) {
  let h = 0
  for (const ch of `${subject}|${slot}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h.toString(36).toUpperCase().padStart(7, '0').slice(-7)
}

/** `subject` hanya dipakai untuk PRESENSI (`SESI-<kode MK>`); KTM selalu milik pemegang sesi. */
export async function issueQr(kind: QrKind, subject: string): Promise<QrToken> {
  if (!USE_DEMO) return request<QrToken>(`qr/issue?kind=${kind}&subject=${encodeURIComponent(subject)}`)
  const now = Math.floor(Date.now() / 1000)
  const slot = Math.floor(now / QR_PERIOD)
  return { kind, subject, slot, code: demoCode(subject, slot), expiresIn: QR_PERIOD - (now % QR_PERIOD), period: QR_PERIOD }
}

export const qrPayload = (t: QrToken) => `SUPERUNPAM:${t.kind}:${t.subject}:${t.slot}:${t.code}`

// — Presensi: validasi QR/kode/geofence dilakukan BFF; mode demo meniru aturannya di klien.
export async function checkIn(input: CheckInRequest, courseName: string): Promise<CheckInResult> {
  if (!USE_DEMO) return post<CheckInResult>('presensi/checkin', input)
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (input.method === 'qr') {
    if (!input.payload.startsWith('SUPERUNPAM:PRESENSI:')) throw new ApiError(422, 'QR bukan QR sesi presensi.')
    return { course: courseName, method: 'Scan QR dosen', time }
  }
  if (input.method === 'kode') {
    if (!/^[A-Z0-9]{6,7}$/.test(input.code)) throw new ApiError(422, 'Kode tidak valid. Kode terdiri dari 6–7 huruf/angka.')
    return { course: courseName, method: 'Kode sesi', time }
  }
  const { demoGeofences } = await demo()
  const best = demoGeofences.map((c) => ({ ...c, d: distanceMeters(input, c) })).sort((a, b) => a.d - b.d)[0]
  if (best.d > best.radius) throw new ApiError(422, `Anda berada ±${(best.d / 1000).toFixed(1)} km dari ${best.name}. Presensi lokasi hanya bisa di area kampus.`)
  return { course: courseName, method: `Lokasi · ${best.name}`, time }
}
