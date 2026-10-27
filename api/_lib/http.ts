import { ZodError, type ZodType } from 'zod'

// Utilitas HTTP bersama untuk semua Vercel Functions di /api (Web Request/Response API).
// Folder berawalan "_" tidak dijadikan endpoint oleh Vercel.

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Server belum dikonfigurasi (secret/env hilang) atau konektor belum diimplementasikan. */
export class ServiceUnavailableError extends Error {}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    // Data pribadi: jangan disimpan cache bersama/CDN.
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

/** Segmen terakhir path, mis. /api/academic/grades → "grades". */
export const lastSegment = (req: Request) => new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? ''

export function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Perlindungan CSRF untuk permintaan yang mengubah data: wajib JSON (form lintas situs tidak bisa
 * mengirim JSON tanpa preflight CORS) dan, bila browser mengirim Origin, harus origin yang sama.
 */
export function assertSameOrigin(req: Request) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Content-Type harus application/json.')
  const origin = req.headers.get('origin')
  if (!origin) return
  // Bandingkan dengan host publik yang diminta browser (di balik proxy/CDN req.url bisa berupa host internal).
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new HttpError(403, 'Origin tidak diizinkan.')
  }
  if (originHost !== host) throw new HttpError(403, 'Origin tidak diizinkan.')
}

const MAX_BODY = 16 * 1024

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const text = await req.text()
  if (text.length > MAX_BODY) throw new HttpError(413, 'Permintaan terlalu besar.')
  let raw: unknown
  try {
    raw = JSON.parse(text || '{}')
  } catch {
    throw new HttpError(400, 'Body bukan JSON yang valid.')
  }
  return schema.parse(raw)
}

/** Membungkus handler: memetakan error ke respons JSON yang konsisten tanpa membocorkan detail internal. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, e.status === 429 ? { 'Retry-After': '60' } : {})
      if (e instanceof ZodError) return json({ error: 'Data yang dikirim tidak valid.', issues: e.issues.map((i) => i.path.join('.')) }, 400)
      if (e instanceof ServiceUnavailableError) return json({ error: e.message }, 503)
      console.error(e)
      return json({ error: 'Terjadi kesalahan pada server.' }, 500)
    }
  }
}
