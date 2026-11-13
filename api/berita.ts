import type { NewsFeed } from '../src/lib/types.js'
import { MAX_ITEMS, parseFeed, parseWordPress, safeUrl } from './_lib/berita.js'
import { handle, HttpError, ServiceUnavailableError } from './_lib/http.js'

// GET /api/berita — berita terbaru dari situs resmi UNPAM, diambil di server (browser tidak memanggil
// unpam.ac.id langsung: CSP connect-src 'self'). Data publik, jadi boleh di-cache CDN 15 menit.
//
// Sumber diatur lewat env (pertanyaan terbuka untuk LPTI, lihat README):
//   NEWS_FEED_URL     https://…unpam.ac.id/wp-json/wp/v2/posts?per_page=10  atau URL RSS/Atom
//   NEWS_FEED_FORMAT  'wp' | 'rss' (bawaan: ditebak dari Content-Type)
// Per 28 Okt 2026 feed dan WP REST di unpam.ac.id / cms.unpam.ac.id berada di balik tantangan bot
// Cloudflare (HTTP 403) untuk klien server. Jangan dilewati; minta akses resmi.

const TIMEOUT_MS = 5000
const MAX_BYTES = 1_000_000
const USER_AGENT = 'SuperUNPAM/0.4 (+https://super-unpam.vercel.app; berita kampus)'

async function readLimited(res: Response) {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new HttpError(502, 'Respons sumber berita terlalu besar.')
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

export const GET = handle(async () => {
  const source = safeUrl(process.env.NEWS_FEED_URL)
  if (!source) throw new ServiceUnavailableError('Sumber berita resmi belum tersedia.')

  let res: Response
  try {
    res = await fetch(source, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, application/rss+xml, application/atom+xml, application/xml;q=0.9' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new HttpError(502, 'Sumber berita tidak dapat dihubungi.')
  }
  if (!res.ok) throw new HttpError(502, `Sumber berita menolak permintaan (${res.status}).`)

  const text = await readLimited(res)
  const format = process.env.NEWS_FEED_FORMAT ?? (res.headers.get('content-type')?.includes('json') ? 'wp' : 'rss')
  let items
  try {
    items = format === 'wp' ? parseWordPress(JSON.parse(text)) : parseFeed(text)
  } catch {
    throw new HttpError(502, 'Format sumber berita tidak dikenali.')
  }

  const body: NewsFeed = { items: items.slice(0, MAX_ITEMS), source: new URL(source).hostname, fetchedAt: new Date().toISOString() }
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
})
