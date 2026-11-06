import { HttpError } from './http.js'

// Pembatas laju dasar (fixed window bucket) di memori instance function.
// Dilengkapi pembersihan kadaluwarsa bertahap dan batas aman ukuran map (LRU eviction)
// untuk mencegah serangan exhaust memory dan CPU event loop freeze.
// TODO(BFF): pindahkan ke penyimpanan terdistribusi (Redis/Upstash KV) saat multi-region.

const buckets = new Map<string, { count: number; reset: number }>()
const MAX_BUCKETS = 10_000
let lastPrune = 0

function pruneExpired(now: number) {
  // Batasi pembersihan maksimal sekali tiap 30 detik agar tidak membebani loop I/O
  if (now - lastPrune < 30_000 && buckets.size < MAX_BUCKETS) return
  lastPrune = now

  for (const [k, b] of buckets) {
    if (b.reset <= now) {
      buckets.delete(k)
    }
  }

  // Jika masih melebihi batas karena banjir kunci acak, lakukan LRU eviction (pangkas 20% tertua)
  if (buckets.size >= MAX_BUCKETS) {
    const keys = buckets.keys()
    let evictCount = Math.floor(MAX_BUCKETS * 0.2)
    while (evictCount-- > 0) {
      const next = keys.next()
      if (next.done) break
      buckets.delete(next.value)
    }
  }
}

export function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now()
  pruneExpired(now)

  const b = buckets.get(key)
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowSeconds * 1000 })
    return
  }

  if (++b.count > limit) {
    const waitMinutes = Math.ceil((b.reset - now) / 60000)
    throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${waitMinutes} menit.`)
  }
}
