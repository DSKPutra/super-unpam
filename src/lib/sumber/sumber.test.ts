import { describe, expect, it } from 'vitest'
import { statusSumber } from './index'
import { sertifikasiDemo } from './sertifikasi'
import { toeflDemo } from './toefl'

const iso = (s: string) => !Number.isNaN(Date.parse(s)) && s.endsWith('Z')

describe('adaptor demo mengembalikan bentuk sesuai tipe', () => {
  it('TOEFL: jadwal, ringkasan, pendaftaran', async () => {
    const jadwal = await toeflDemo.daftarJadwal()
    expect(jadwal.asal).toBe('contoh')
    for (const j of jadwal.data) {
      expect(j).toEqual({ id: expect.any(String), jenis: expect.any(String), tanggal: expect.any(String), tempat: expect.any(String), kuota: expect.any(Number), terisi: expect.any(Number), biaya: expect.any(Number), tutupDaftar: expect.any(String) })
      expect(iso(j.tanggal) && iso(j.tutupDaftar)).toBe(true)
      expect(j.terisi).toBeLessThanOrEqual(j.kuota)
      expect(Number.isInteger(j.biaya)).toBe(true)
    }
    const r = await toeflDemo.ringkasan()
    expect(r.asal).toBe('contoh')
    expect(r.data.target === null || typeof r.data.target === 'number').toBe(true)
    for (const h of r.data.hasil) expect(iso(h.tanggal) && iso(h.berlakuSampai)).toBe(true)
    const p = await toeflDemo.daftar('jt-x')
    expect(p).toEqual({ asal: 'contoh', data: { id: 'pt-jt-x', jadwalId: 'jt-x', status: 'menunggu-bayar' } })
  })

  it('Sertifikasi: rujukan skema konsisten', async () => {
    const { data, asal } = await sertifikasiDemo.ringkasan()
    expect(asal).toBe('contoh')
    const ids = new Set(data.skema.map((s) => s.id))
    for (const u of data.ujian) expect(ids.has(u.skemaId)).toBe(true)
    for (const c of data.sertifikat) {
      expect(ids.has(c.skemaId)).toBe(true)
      expect(iso(c.terbit)).toBe(true)
    }
    expect((await sertifikasiDemo.daftar('sk-dba')).data).toMatchObject({ skemaId: 'sk-dba', status: 'terdaftar' })
  })
})

describe('statusSumber (label koneksi jujur)', () => {
  it('"Terhubung" hanya bila data berasal dari sistem asli', () => {
    expect(statusSumber({ data: { asal: 'MyLB' }, loading: false }, 'MyLB')).toEqual({ tone: 'green', teks: 'Terhubung ke MyLB' })
    expect(statusSumber({ data: { asal: 'contoh' }, loading: false }, 'MyLB').teks).toBe('Data contoh')
    // Sistem lain yang menjawab tidak dianggap terhubung ke sistem ini.
    expect(statusSumber({ data: { asal: 'MyLSP' }, loading: false }, 'MyLB').teks).toBe('Data contoh')
  })

  it('galat dan memuat', () => {
    expect(statusSumber({ error: new Error('x'), loading: false }, 'MyLSP')).toEqual({ tone: 'red', teks: 'Tidak dapat terhubung ke MyLSP' })
    expect(statusSumber({ loading: true }, 'MyLSP').teks).toMatch(/Menghubungkan/)
  })
})
