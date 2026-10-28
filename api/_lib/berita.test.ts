import { describe, expect, it } from 'vitest'
import { htmlToText, isoDate, MAX_ITEMS, parseFeed, parseWordPress, safeUrl } from './berita.js'

describe('htmlToText (pembersihan HTML)', () => {
  it('membuang script, style, iframe beserta isinya', () => {
    const out = htmlToText('<p>Halo</p><script>alert(1)</script><style>p{}</style><iframe src="x">y</iframe> dunia')
    expect(out).toBe('Halo dunia')
  })

  it('membuang atribut event handler dan URL javascript: (tidak ada tag tersisa)', () => {
    const out = htmlToText('<img src=x onerror="alert(1)"><a href="javascript:alert(1)">klik</a>')
    expect(out).toBe('klik')
    expect(out).not.toMatch(/[<>]/)
  })

  it('tag yang disusun lewat entitas tidak lolos', () => {
    expect(htmlToText('&lt;script&gt;alert(1)&lt;/script&gt; teks')).not.toMatch(/<script/i)
  })

  it('tag tak tertutup dan karakter kontrol', () => {
    expect(htmlToText('aman <img src=x onerror=alert(1)')).toBe('aman')
    expect(htmlToText('a\u0000b\u0007c')).toBe('a b c')
  })

  it('mendekode entitas umum dan memotong ringkasan panjang', () => {
    expect(htmlToText('Rapat &amp; Seminar&nbsp;&#8211; UNPAM')).toBe('Rapat & Seminar – UNPAM')
    const long = htmlToText('x'.repeat(500), 100)
    expect(long).toHaveLength(100)
    expect(long.endsWith('…')).toBe(true)
  })
})

describe('safeUrl & isoDate', () => {
  it('hanya https di domain unpam.ac.id', () => {
    expect(safeUrl('https://unpam.ac.id/berita/a')).toBe('https://unpam.ac.id/berita/a')
    expect(safeUrl('https://cms.unpam.ac.id/x')).toBe('https://cms.unpam.ac.id/x')
    expect(safeUrl('http://unpam.ac.id/a')).toBeNull()
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('https://unpam.ac.id.evil.com/a')).toBeNull()
    expect(safeUrl('https://evilunpam.ac.id/a')).toBeNull()
    expect(safeUrl('https://user:pw@unpam.ac.id/')).toBeNull()
    expect(safeUrl(42)).toBeNull()
  })

  it('format tanggal RSS, ISO, dan WordPress tanpa zona', () => {
    expect(isoDate('Tue, 27 Oct 2026 03:00:00 +0700')).toBe('2026-10-26T20:00:00.000Z')
    expect(isoDate('2026-10-27T03:00:00')).toBe('2026-10-27T03:00:00.000Z')
    expect(isoDate('bukan tanggal')).toBeNull()
    expect(isoDate('')).toBeNull()
  })
})

describe('parseWordPress', () => {
  const post = (id: number, extra: Record<string, unknown> = {}) => ({
    id,
    date_gmt: `2026-10-${String(10 + id).padStart(2, '0')}T01:00:00`,
    link: `https://unpam.ac.id/berita/${id}`,
    title: { rendered: `Judul ${id}` },
    excerpt: { rendered: '<p>Ringkasan</p>' },
    ...extra,
  })

  it('menormalisasi dan mengurutkan terbaru dulu', () => {
    const out = parseWordPress([post(1), post(3), post(2)])
    expect(out.map((x) => x.id)).toEqual(['3', '2', '1'])
    expect(out[0]).toEqual({ id: '3', title: 'Judul 3', summary: 'Ringkasan', date: '2026-10-13T01:00:00.000Z', url: 'https://unpam.ac.id/berita/3', tag: undefined })
  })

  it('membuang butir dengan tautan luar, tanggal rusak, atau judul kosong', () => {
    const out = parseWordPress([post(1, { link: 'https://evil.com/x' }), post(2, { date_gmt: 'x', date: 'x' }), post(3, { title: { rendered: '<b></b>' } }), post(4)])
    expect(out.map((x) => x.id)).toEqual(['4'])
  })

  it(`maksimal ${MAX_ITEMS} butir dan tahan masukan bukan array`, () => {
    expect(parseWordPress(Array.from({ length: 15 }, (_, i) => post(i + 1)))).toHaveLength(MAX_ITEMS)
    expect(parseWordPress({ code: 'rest_forbidden' })).toEqual([])
    expect(parseWordPress([null, 1, 'x'])).toEqual([])
  })
})

describe('parseFeed', () => {
  it('RSS 2.0 dengan CDATA', () => {
    const xml = `<rss><channel><item><title><![CDATA[UTS <b>Ganjil</b>]]></title><link>https://unpam.ac.id/uts</link>
      <guid>u1</guid><pubDate>Tue, 27 Oct 2026 03:00:00 +0700</pubDate><category>Akademik</category>
      <description><![CDATA[<p>Jadwal <script>x()</script>terbit</p>]]></description></item></channel></rss>`
    expect(parseFeed(xml)).toEqual([{ id: 'u1', title: 'UTS Ganjil', summary: 'Jadwal terbit', date: '2026-10-26T20:00:00.000Z', url: 'https://unpam.ac.id/uts', tag: 'Akademik' }])
  })

  it('Atom', () => {
    const xml = `<feed><entry><id>a1</id><title>Wisuda</title><link href="https://unpam.ac.id/wisuda"/><updated>2026-10-20T00:00:00Z</updated><summary>Info</summary></entry></feed>`
    expect(parseFeed(xml)[0]).toMatchObject({ id: 'a1', title: 'Wisuda', url: 'https://unpam.ac.id/wisuda' })
  })

  it('HTML biasa (mis. halaman tantangan bot) menghasilkan daftar kosong', () => {
    expect(parseFeed('<!DOCTYPE html><html><title>Just a moment...</title></html>')).toEqual([])
  })
})
