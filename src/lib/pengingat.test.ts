import { describe, expect, it } from 'vitest'
import { hindariJamTenang, jadwalkanPengingat, jumlahBelumDibaca, PREFERENSI_BAWAAN, type PreferensiPengingat, type Tenggat } from './pengingat'

// Semua waktu dalam WIB (UTC+7) agar mudah dibaca; dikonversi ke UTC di sini.
const wib = (s: string) => Date.parse(`${s}+07:00`)
const isoWib = (s: string) => new Date(wib(s)).toISOString()
const NOW = wib('2026-10-28T09:00:00')
const tugas = (id: string, waktu: string, jenis: Tenggat['jenis'] = 'tugas'): Tenggat => ({ id, jenis, judul: `Judul ${id}`, waktu: isoWib(waktu) })

describe('hindariJamTenang', () => {
  const jam = { mulai: '22:00', selesai: '06:00' }
  it('di luar jam tenang tidak berubah', () => {
    expect(hindariJamTenang(wib('2026-10-28T21:59:00'), jam)).toBe(wib('2026-10-28T21:59:00'))
    expect(hindariJamTenang(wib('2026-10-29T06:00:00'), jam)).toBe(wib('2026-10-29T06:00:00'))
  })
  it('jam tenang lewat tengah malam dimajukan ke 21:59 malam sebelumnya', () => {
    expect(hindariJamTenang(wib('2026-10-28T23:30:00'), jam)).toBe(wib('2026-10-28T21:59:00'))
    expect(hindariJamTenang(wib('2026-10-29T05:00:00'), jam)).toBe(wib('2026-10-28T21:59:00'))
    expect(hindariJamTenang(wib('2026-10-28T22:00:00'), jam)).toBe(wib('2026-10-28T21:59:00'))
  })
  it('jam tenang di siang hari dan tanpa jam tenang', () => {
    expect(hindariJamTenang(wib('2026-10-28T13:30:00'), { mulai: '12:00', selesai: '14:00' })).toBe(wib('2026-10-28T11:59:00'))
    expect(hindariJamTenang(wib('2026-10-28T23:30:00'), null)).toBe(wib('2026-10-28T23:30:00'))
  })
  it('format jam salah ditolak', () => {
    expect(() => hindariJamTenang(0, { mulai: '25:00', selesai: '06:00' })).toThrow()
  })
})

describe('jadwalkanPengingat', () => {
  const pref: PreferensiPengingat = { ...PREFERENSI_BAWAAN, maksPerHari: 10 }

  it('H-1 dan H-1 jam, terurut, id stabil', () => {
    const out = jadwalkanPengingat([tugas('t1', '2026-10-30T15:00:00')], pref, NOW)
    expect(out.map((n) => [n.id, n.waktu])).toEqual([
      ['t1:1440', isoWib('2026-10-29T15:00:00')],
      ['t1:60', isoWib('2026-10-30T14:00:00')],
    ])
    expect(out[0].isi).toMatch(/^Tenggat 1 hari lagi · /)
    expect(out[1].isi).toMatch(/^Tenggat 1 jam lagi · /)
  })

  it('pengingat di jam tenang dimajukan; tidak pernah setelah tenggat', () => {
    const out = jadwalkanPengingat([tugas('t1', '2026-10-30T00:30:00')], pref, NOW)
    // H-1 = 29 Okt 00:30 → 28 Okt 21:59 ; H-1 jam = 29 Okt 23:30 → 29 Okt 21:59
    expect(out.map((n) => n.waktu)).toEqual([isoWib('2026-10-28T21:59:00'), isoWib('2026-10-29T21:59:00')])
    for (const n of out) expect(Date.parse(n.waktu)).toBeLessThan(wib('2026-10-30T00:30:00'))
  })

  it('dua pengingat yang terdorong ke menit yang sama digabung', () => {
    // Tenggat 23:30: H-1 jam = 22:30 → 21:59 ; tambah offset 30 menit → 23:00 → 21:59 juga.
    const out = jadwalkanPengingat([tugas('t1', '2026-10-28T23:30:00')], { ...pref, sebelumMenit: [60, 30] }, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].waktu).toBe(isoWib('2026-10-28T21:59:00'))
  })

  it('duplikat tenggat dan offset ganda tidak menggandakan notifikasi', () => {
    const t = tugas('t1', '2026-10-30T15:00:00')
    const out = jadwalkanPengingat([t, { ...t }, t], { ...pref, sebelumMenit: [60, 60, 1440] }, NOW)
    expect(out.map((n) => n.id)).toEqual(['t1:1440', 't1:60'])
  })

  it('tenggat lewat, pengingat yang waktunya sudah lewat, dan tanggal rusak dibuang', () => {
    const out = jadwalkanPengingat([tugas('lewat', '2026-10-28T08:00:00'), tugas('dekat', '2026-10-28T09:30:00'), { id: 'rusak', jenis: 'tugas', judul: 'x', waktu: 'kapan-kapan' }], pref, NOW)
    expect(out.map((n) => n.id)).toEqual([]) // "dekat": H-1 jam = 08:30 < sekarang, H-1 hari juga lewat
  })

  it('hanya jenis yang diaktifkan', () => {
    const out = jadwalkanPengingat([tugas('t1', '2026-10-30T15:00:00'), tugas('b1', '2026-10-30T15:00:00', 'tagihan')], { ...pref, jenis: { ...pref.jenis, tagihan: false } }, NOW)
    expect(new Set(out.map((n) => n.tenggatId))).toEqual(new Set(['t1']))
  })

  it('batas per hari mendahulukan tenggat terdekat', () => {
    const daftar = [tugas('jauh', '2026-10-31T10:00:00'), tugas('dekat', '2026-10-29T18:00:00'), tugas('tengah', '2026-10-30T09:00:00')]
    // Hanya H-1 hari: jauh → 30 Okt 10:00, dekat → 28 Okt 18:00, tengah → 29 Okt 09:00 (hari berbeda semua)
    expect(jadwalkanPengingat(daftar, { ...pref, sebelumMenit: [1440], maksPerHari: 1 }, NOW)).toHaveLength(3)
    // H-1 jam semuanya di hari yang sama? Gunakan tiga tenggat di hari yang sama.
    const samaHari = [tugas('a', '2026-10-29T18:00:00'), tugas('b', '2026-10-29T12:00:00'), tugas('c', '2026-10-29T15:00:00')]
    const out = jadwalkanPengingat(samaHari, { ...pref, sebelumMenit: [60], maksPerHari: 2 }, NOW)
    expect(out.map((n) => n.tenggatId)).toEqual(['b', 'c'])
    expect(jadwalkanPengingat(samaHari, { ...pref, sebelumMenit: [60], maksPerHari: 0 }, NOW)).toEqual([])
  })
})

describe('jumlahBelumDibaca (lonceng)', () => {
  const n = (id: number, read: boolean) => ({ id, src: 'x', text: 'x', time: 'x', read })
  it('menghitung dari data, dikurangi yang sudah ditandai dibaca di perangkat', () => {
    expect(jumlahBelumDibaca([n(1, false), n(2, false), n(3, true)], [])).toBe(2)
    expect(jumlahBelumDibaca([n(1, false), n(2, false)], [2])).toBe(1)
    expect(jumlahBelumDibaca(undefined, [])).toBe(0)
  })
})
