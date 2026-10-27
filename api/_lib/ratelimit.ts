import { HttpError } from './http'

// Pembatas laju dasar (fixed window) di memori instance function.
// TODO(BFF): pindahkan ke penyimpanan bersama (mis. Redis/KV) — di serverless tiap instance punya
// hitungannya sendiri, jadi ini hanya menahan serangan beruntun dari satu instance.

const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now()
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k)
  const b = buckets.get(key)
  if (!b || b.reset <= now) return void buckets.set(key, { count: 1, reset: now + windowSeconds * 1000 })
  if (++b.count > limit) throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((b.reset - now) / 60000)} menit.`)
}
