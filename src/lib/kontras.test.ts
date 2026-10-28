import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Uji kontras otomatis untuk kedua tema (U04: halaman kuesioner pernah bermasalah di mode gelap pada
// aplikasi sejenis). Nilai token dibaca langsung dari src/index.css supaya uji ikut berubah bila token berubah.

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

function tokens(selector: string) {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`blok ${selector} tidak ditemukan`)
  const block = css.slice(start, css.indexOf('\n}', start))
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

type RGBA = [number, number, number, number]
function parse(c: string): RGBA {
  const hex = /^#([0-9a-f]{6})$/i.exec(c)
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA
  const rgba = /^rgba?\(([^)]+)\)$/.exec(c)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map((s) => s.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  throw new Error(`warna tidak dikenal: ${c}`)
}
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA
const lum = ([r, g, b]: RGBA) => {
  const ch = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const ratio = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const dark = tokens(':root')
const light = { ...dark, ...tokens(":root[data-theme='light']") }

describe.each([
  ['gelap', dark],
  ['terang', light],
])('kontras kuesioner — tema %s', (_, t) => {
  const page = parse(t['bg-800'])
  // Kartu .glass dan tombol opsi (bg-glass-strong) dilapis di atas latar halaman.
  const card = over(parse(t.glass), page)
  const option = over(parse(t['glass-strong']), card)
  const primary = parse(t.primary)
  const white: RGBA = [255, 255, 255, 1]

  it.each([
    ['teks utama di kartu', parse(t['text-hi']), card],
    ['teks sekunder di kartu', parse(t['text-mid']), card],
    ['teks rendah di kartu (label skala, penghitung)', parse(t['text-low']), card],
    ['teks opsi belum dipilih', parse(t['text-mid']), option],
    ['teks opsi terpilih (putih di primary)', white, primary],
    ['pesan galat (rose) di kartu', parse(t.rose), card],
  ] as const)('%s ≥ 4.5:1 (WCAG AA)', (_, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})
