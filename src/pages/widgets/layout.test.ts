import { describe, expect, it } from 'vitest'
import { moveWidget, normalizeLayout, toggleWidget } from './layout'

const KNOWN = ['ktm', 'kelas', 'ipk', 'berita', 'event']
const NEW = ['event']

describe('normalizeLayout', () => {
  it('memakai urutan bawaan untuk nilai kosong atau rusak', () => {
    for (const raw of [undefined, null, 'x', 42, [], {}, { order: 'ktm', hidden: {} }]) {
      expect(normalizeLayout(raw, KNOWN, NEW)).toEqual({ order: KNOWN, hidden: ['event'] })
    }
  })

  it('urutan kosong menghasilkan urutan bawaan', () => {
    expect(normalizeLayout({ order: [], hidden: [] }, KNOWN, NEW)).toEqual({ order: KNOWN, hidden: ['event'] })
  })

  it('membuang id yang tidak dikenal dan bukan string', () => {
    const out = normalizeLayout({ order: ['berita', 'hapus', 7, 'ktm'], hidden: ['hapus', 'ktm', null] }, KNOWN)
    expect(out.order.slice(0, 2)).toEqual(['berita', 'ktm'])
    expect(out.order).not.toContain('hapus')
    expect(out.hidden).toEqual(['ktm'])
  })

  it('membuang duplikat dengan mempertahankan kemunculan pertama', () => {
    const out = normalizeLayout({ order: ['ipk', 'ktm', 'ipk', 'ktm'], hidden: ['ipk', 'ipk'] }, KNOWN)
    expect(out.order).toEqual(['ipk', 'ktm', 'kelas', 'berita', 'event'])
    expect(out.hidden).toEqual(['ipk'])
  })

  it('menambahkan widget baru di akhir, tersembunyi bila bawaannya tersembunyi', () => {
    const out = normalizeLayout({ order: ['berita', 'ktm'], hidden: [] }, KNOWN, NEW)
    expect(out.order).toEqual(['berita', 'ktm', 'kelas', 'ipk', 'event'])
    expect(out.hidden).toEqual(['event'])
  })

  it('tidak menyembunyikan ulang widget baru yang sudah tercatat tampil', () => {
    const out = normalizeLayout({ order: [...KNOWN], hidden: [] }, KNOWN, NEW)
    expect(out.hidden).toEqual([])
  })
})

describe('moveWidget & toggleWidget', () => {
  const base = { order: ['a', 'b', 'c'], hidden: ['c'] }

  it('menukar dengan tetangga', () => {
    expect(moveWidget(base, 'b', -1).order).toEqual(['b', 'a', 'c'])
    expect(moveWidget(base, 'b', 1).order).toEqual(['a', 'c', 'b'])
  })

  it('tidak berubah di batas atau untuk id tak dikenal', () => {
    expect(moveWidget(base, 'a', -1)).toBe(base)
    expect(moveWidget(base, 'c', 1)).toBe(base)
    expect(moveWidget(base, 'x', 1)).toBe(base)
  })

  it('menyalakan/mematikan tampil dengan urutan hidden mengikuti order', () => {
    expect(toggleWidget(base, 'c').hidden).toEqual([])
    expect(toggleWidget(base, 'a').hidden).toEqual(['a', 'c'])
  })
})
