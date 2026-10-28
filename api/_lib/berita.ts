import type { NewsArticle } from '../../src/lib/types.js'

// Normalisasi berita dari situs resmi (WordPress REST atau RSS/Atom) menjadi NewsArticle.
// Fungsi murni tanpa jaringan supaya bisa diuji dengan masukan jahat (berita.test.ts).

export const MAX_ITEMS = 10
const SUMMARY_MAX = 240
/** Hanya tautan ke domain kampus yang ditampilkan; tautan lain dibuang beserta butirnya. */
const ALLOWED_HOST = /(^|\.)unpam\.ac\.id$/i

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }

function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

/**
 * HTML → teks biasa. Ringkasan sengaja ditampilkan sebagai teks (bukan HTML), jadi tidak ada
 * elemen, atribut, atau URL dari sumber luar yang sampai ke DOM. Isi script/style/iframe dibuang utuh.
 */
export function htmlToText(html: string, max = SUMMARY_MAX) {
  const text = decodeEntities(
    html
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?(<\/\1\s*>|$)/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>?/g, ' '),
  )
    // Entitas bisa menyusun ulang tag (&lt;script&gt;); buang lagi setelah di-decode.
    .replace(/<[^>]*>?/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' && ALLOWED_HOST.test(u.hostname) && !u.username && !u.password ? u.toString() : null
  } catch {
    return null
  }
}

export function isoDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  // WordPress "date_gmt" tanpa zona waktu → anggap UTC.
  const s = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw.trim()) ? `${raw.trim()}Z` : raw.trim()
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function article(id: unknown, title: unknown, summary: unknown, date: unknown, url: unknown, tag?: unknown): NewsArticle | null {
  const link = safeUrl(url)
  const iso = isoDate(date)
  const judul = typeof title === 'string' ? htmlToText(title, 160) : ''
  if (!link || !iso || !judul) return null
  return {
    id: String(id ?? link).slice(0, 64),
    title: judul,
    summary: typeof summary === 'string' ? htmlToText(summary) : '',
    date: iso,
    url: link,
    tag: typeof tag === 'string' && tag.trim() ? htmlToText(tag, 24) : undefined,
  }
}

const finish = (items: (NewsArticle | null)[]) =>
  items
    .filter((x): x is NewsArticle => !!x)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_ITEMS)

/** Respons WordPress REST `/wp-json/wp/v2/posts`. */
export function parseWordPress(body: unknown): NewsArticle[] {
  if (!Array.isArray(body)) return []
  return finish(
    body.map((p: Record<string, unknown>) => {
      const rendered = (v: unknown) => (v && typeof v === 'object' ? (v as { rendered?: unknown }).rendered : undefined)
      return article(p?.id, rendered(p?.title), rendered(p?.excerpt), p?.date_gmt ?? p?.date, p?.link)
    }),
  )
}

const tag = (xml: string, name: string) => new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml)?.[1]
const attr = (xml: string, name: string, a: string) => new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`, 'i').exec(xml)?.[1]

/** RSS 2.0 (`<item>`) atau Atom (`<entry>`). Parser sederhana tanpa dependency; cukup untuk feed WordPress. */
export function parseFeed(xml: string): NewsArticle[] {
  if (typeof xml !== 'string') return []
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []
  if (items.length)
    return finish(items.map((it) => article(tag(it, 'guid') ?? tag(it, 'link'), tag(it, 'title'), tag(it, 'description'), tag(it, 'pubDate'), decodeEntities(tag(it, 'link')?.replace(/<!\[CDATA\[|\]\]>/g, '') ?? ''), tag(it, 'category'))))
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []
  return finish(entries.map((e) => article(tag(e, 'id'), tag(e, 'title'), tag(e, 'summary') ?? tag(e, 'content'), tag(e, 'updated') ?? tag(e, 'published'), attr(e, 'link', 'href'), attr(e, 'category', 'term'))))
}
