import { describe, expect, it } from 'vitest'
import { karyaContoh, koleksiContoh } from '../../data/perpustakaan-contoh'
import { cariKarya, cariKoleksi, hakBerkas, sitasiAPA, sitasiBibtex, statistik, tersedia } from './repositori'

const now = new Date('2026-11-13T00:00:00Z')
const byId = (id: string) => karyaContoh.find((k) => k.id === id)!

describe('repositori karya akhir', () => {
  it('pencarian berperingkat: judul di atas abstrak; semua kata wajib cocok', () => {
    const r = cariKarya(karyaContoh, { q: 'qr antrean' })
    expect(r[0].id).toBe('rp-01')
    expect(cariKarya(karyaContoh, { q: 'qr hukum' })).toEqual([])
    expect(cariKarya(karyaContoh, { q: 'Rina' }).map((k) => k.id)).toEqual(['rp-01', 'rp-06'])
  })

  it('filter jenis, prodi, rentang tahun', () => {
    expect(cariKarya(karyaContoh, { jenis: 'DISERTASI' }).map((k) => k.id)).toEqual(['rp-10', 'rp-09'])
    expect(cariKarya(karyaContoh, { prodi: 'Akuntansi' }).map((k) => k.id)).toEqual(['rp-04'])
    expect(cariKarya(karyaContoh, { tahunDari: 2025, tahunSampai: 2025 }).every((k) => k.tahunLulus === 2025)).toBe(true)
  })

  it('akses berkas: terbuka, civitas, embargo', () => {
    expect(hakBerkas(byId('rp-01'), null, now).boleh).toBe(true)
    expect(hakBerkas(byId('rp-02'), null, now)).toMatchObject({ boleh: false, alasan: expect.stringMatching(/civitas/) })
    expect(hakBerkas(byId('rp-02'), { role: 'ALUMNI' }, now).boleh).toBe(true)
    expect(hakBerkas(byId('rp-04'), { role: 'DOSEN' }, now)).toMatchObject({ boleh: false, alasan: expect.stringMatching(/embargo.*2027/) })
    expect(hakBerkas(byId('rp-04'), null, new Date('2027-09-01')).boleh).toBe(true)
  })

  it('sitasi APA & BibTeX', () => {
    expect(sitasiAPA(byId('rp-06'))).toBe('Anggraini, M. (2024). Model Adopsi Layanan Kampus Terpadu Berbasis Aplikasi Seluler: Perluasan UTAUT2 [Tesis magister, Universitas Pamulang].')
    expect(sitasiBibtex(byId('rp-09'))).toMatch(/^@phdthesis\{prasetyo2025,/)
    expect(sitasiBibtex(byId('rp-01'))).toMatch(/note = \{Skripsi sarjana\}/)
  })

  it('statistik & katalog', () => {
    expect(statistik(karyaContoh).perJenis).toEqual({ SKRIPSI: 5, TESIS: 3, DISERTASI: 2 })
    expect(cariKoleksi(koleksiContoh, 'sql').map((k) => k.id)).toEqual(['kl-01'])
    expect(tersedia(koleksiContoh[1])).toBe(0)
  })
})
