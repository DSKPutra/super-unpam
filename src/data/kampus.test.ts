import { describe, expect, it } from 'vitest'
import { FAKULTAS, KONTAK, LAYANAN, LOKASI, MOTO, SEJARAH, tautanPeta } from './kampus'

const semua = [MOTO, ...LOKASI, ...FAKULTAS, ...LAYANAN, ...KONTAK, ...(SEJARAH ? [SEJARAH] : [])]

describe('fakta kampus bersumber (U06)', () => {
  it('setiap butir punya sumber resmi https *.unpam.ac.id dan tanggal dibaca', () => {
    for (const x of semua) {
      expect(new URL(x.sumber).protocol).toBe('https:')
      expect(new URL(x.sumber).hostname).toMatch(/(^|\.)unpam\.ac\.id$/)
      expect(x.dicek).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(x.dicek))).toBe(false)
      expect(typeof x.terverifikasi).toBe('boolean')
    }
  })

  it('tidak ada koordinat atau jam layanan karangan', () => {
    for (const l of LOKASI) expect(Object.keys(l)).not.toEqual(expect.arrayContaining(['lat', 'lng']))
    for (const l of LAYANAN) if (l.jam !== undefined) expect(l.terverifikasi).toBe(true)
  })

  it('tautan layanan, fakultas, dan kontak web hanya ke domain kampus', () => {
    for (const x of [...FAKULTAS, ...LAYANAN]) expect(new URL(x.url).hostname).toMatch(/(^|\.)unpam\.ac\.id$/)
    for (const k of KONTAK) expect(k.href).toMatch(/^(mailto:[^@]+@unpam\.ac\.id|https:\/\/(wa\.me\/\d+|([\w-]+\.)*unpam\.ac\.id\/?))$/)
  })

  it('tautan peta memakai alamat yang di-encode, bukan koordinat', () => {
    const p = tautanPeta('Jl. Surya Kencana No.1, Pamulang')
    expect(p.geo).toBe('geo:0,0?q=Jl.%20Surya%20Kencana%20No.1%2C%20Pamulang')
    expect(p.web).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Jl\./)
  })
})
