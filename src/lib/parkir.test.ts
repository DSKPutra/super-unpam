import { describe, expect, it } from 'vitest'
import { ATURAN_PARKIR as A } from '../data/aturan-parkir'
import { arahBerikutnya, bolehHapus, dalamJamOperasi, formatDurasi, normalisasiPlat, okupansi, prosesGerbang, validasiKendaraan, type AreaParkir, type KeadaanParkir, type Kendaraan } from './parkir'

const motor: Kendaraan = { id: 'KND-1', plat: 'B 1234 XYZ', jenis: 'motor', merek: 'Honda Beat', warna: 'Hitam', status: 'terverifikasi' }
const mobil: Kendaraan = { id: 'KND-2', plat: 'B 77 UNP', jenis: 'mobil', merek: 'Avanza', warna: 'Putih', status: 'terverifikasi' }
const area: AreaParkir[] = [
  { id: 'M', nama: 'Motor A', kampus: 'Pamulang', jenis: 'motor', kapasitas: 10, terisi: 3 },
  { id: 'C', nama: 'Mobil A', kampus: 'Pamulang', jenis: 'mobil', kapasitas: 2, terisi: 2 },
]
const pagi = new Date('2026-10-28T07:30:00+07:00')
const keadaan = (x: Partial<KeadaanParkir> = {}): KeadaanParkir => ({ ktmBeku: false, kendaraan: [motor, mobil], sesiAktif: null, ...x })
const pindai = (arah: 'masuk' | 'keluar', kendaraanId = 'KND-1', areaId = 'M', waktu = pagi) => ({ arah, kendaraanId, areaId, waktu, idBaru: 'S1' })

describe('parkir: plat & pendaftaran', () => {
  it('normalisasi plat Indonesia', () => {
    expect(normalisasiPlat('b1234xyz')).toBe('B 1234 XYZ')
    expect(normalisasiPlat(' B-1234-XYZ ')).toBe('B 1234 XYZ')
    expect(normalisasiPlat('ab 12 c')).toBe('AB 12 C')
    expect(normalisasiPlat('B 1')).toBe('B 1')
    expect(normalisasiPlat('12345')).toBeNull()
    expect(normalisasiPlat('B 12345 XYZ')).toBeNull()
    expect(normalisasiPlat('ABC 1 X')).toBeNull()
  })

  it('validasi kendaraan: duplikat, batas jumlah, STNK', () => {
    const stnk = { nama: 'stnk.pdf', ukuran: 100_000, tipe: 'application/pdf' }
    const baru = { plat: 'B 9 AA', jenis: 'motor' as const, merek: 'Vario', warna: 'Merah', stnk }
    expect(validasiKendaraan(baru, [motor], A)).toEqual([])
    expect(validasiKendaraan({ ...baru, plat: 'b1234xyz' }, [motor], A).join()).toMatch(/sudah terdaftar/)
    expect(validasiKendaraan(baru, [motor, mobil], A).join()).toMatch(/Maksimal 2/)
    // kendaraan yang ditolak tidak dihitung kuota
    expect(validasiKendaraan(baru, [motor, { ...mobil, status: 'ditolak' }], A)).toEqual([])
    expect(validasiKendaraan({ ...baru, stnk: undefined }, [], A).join()).toMatch(/STNK/)
    expect(validasiKendaraan({ ...baru, stnk: { ...stnk, tipe: 'image/gif' } }, [], A).join()).toMatch(/PDF, JPG/)
    expect(validasiKendaraan({ ...baru, stnk: { ...stnk, ukuran: 5e6 } }, [], A).join()).toMatch(/maksimal 2 MB/)
  })
})

describe('parkir: gerbang & anti-passback', () => {
  it('masuk lalu keluar menghasilkan sesi lengkap', () => {
    const m = prosesGerbang(keadaan(), area, pindai('masuk'), A)
    expect(m.ok).toBe(true)
    if (!m.ok) return
    expect(m.sesi).toMatchObject({ kendaraanId: 'KND-1', plat: 'B 1234 XYZ', areaId: 'M' })
    expect(arahBerikutnya({ sesiAktif: m.sesi })).toBe('keluar')
    const k = prosesGerbang(keadaan({ sesiAktif: m.sesi }), area, pindai('keluar', 'KND-1', 'M', new Date('2026-10-28T10:45:00+07:00')), A)
    expect(k.ok).toBe(true)
    if (k.ok) {
      expect(k.sesi.keluar).toBe('2026-10-28T03:45:00.000Z')
      expect(k.sesi.menginap).toBe(false)
      expect(k.pesan).toMatch(/3 j 15 mnt/)
    }
  })

  it('menolak masuk dua kali dan keluar tanpa masuk', () => {
    const m = prosesGerbang(keadaan(), area, pindai('masuk'), A)
    if (!m.ok) throw new Error('harus ok')
    const lagi = prosesGerbang(keadaan({ sesiAktif: m.sesi }), area, pindai('masuk'), A)
    expect(lagi.ok).toBe(false)
    if (!lagi.ok) expect(lagi.alasan).toMatch(/Anti-passback/)
    const keluar = prosesGerbang(keadaan(), area, pindai('keluar'), A)
    if (!keluar.ok) expect(keluar.alasan).toMatch(/Tidak ada catatan masuk/)
  })

  it('keluar harus dengan kendaraan yang sama', () => {
    const m = prosesGerbang(keadaan(), area, pindai('masuk'), A)
    if (!m.ok) throw new Error('harus ok')
    const r = prosesGerbang(keadaan({ sesiAktif: m.sesi }), area, pindai('keluar', 'KND-2', 'C'), A)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.alasan).toMatch(/berbeda/)
  })

  it('KTM beku, kendaraan belum diverifikasi, area salah/penuh, jam tutup', () => {
    const tolak = (r: ReturnType<typeof prosesGerbang>) => (r.ok ? '' : r.alasan)
    expect(tolak(prosesGerbang(keadaan({ ktmBeku: true }), area, pindai('masuk'), A))).toMatch(/dibekukan/)
    expect(tolak(prosesGerbang(keadaan({ kendaraan: [{ ...motor, status: 'menunggu' }] }), area, pindai('masuk'), A))).toMatch(/belum diverifikasi/)
    expect(tolak(prosesGerbang(keadaan(), area, pindai('masuk', 'KND-1', 'C'), A))).toMatch(/khusus mobil/)
    expect(tolak(prosesGerbang(keadaan(), area, pindai('masuk', 'KND-2', 'C'), A))).toMatch(/penuh/)
    expect(tolak(prosesGerbang(keadaan(), area, pindai('masuk', 'KND-1', 'M', new Date('2026-10-28T23:10:00+07:00')), A))).toMatch(/jam operasional/)
    expect(tolak(prosesGerbang(keadaan(), area, pindai('masuk', 'KND-X'), A))).toMatch(/tidak terdaftar/)
  })

  it('keluar tetap boleh di luar jam operasional; parkir lama ditandai menginap', () => {
    const m = prosesGerbang(keadaan(), area, pindai('masuk'), A)
    if (!m.ok) throw new Error('harus ok')
    const r = prosesGerbang(keadaan({ sesiAktif: m.sesi }), area, pindai('keluar', 'KND-1', 'M', new Date('2026-10-29T02:00:00+07:00')), A)
    expect(r.ok && r.sesi.menginap).toBe(true)
  })

  it('kendaraan yang sedang parkir tidak boleh dihapus', () => {
    const m = prosesGerbang(keadaan(), area, pindai('masuk'), A)
    if (!m.ok) throw new Error('harus ok')
    expect(bolehHapus({ sesiAktif: m.sesi }, 'KND-1')).toBe(false)
    expect(bolehHapus({ sesiAktif: m.sesi }, 'KND-2')).toBe(true)
  })
})

describe('parkir: utilitas', () => {
  it('okupansi & jam operasi & durasi', () => {
    expect(okupansi({ kapasitas: 10, terisi: 3 }, A)).toEqual({ persen: 30, sisa: 7, tingkat: 'lengang' })
    expect(okupansi({ kapasitas: 10, terisi: 8 }, A).tingkat).toBe('ramai')
    expect(okupansi({ kapasitas: 10, terisi: 12 }, A)).toEqual({ persen: 100, sisa: 0, tingkat: 'penuh' })
    expect(dalamJamOperasi(new Date('2026-10-28T05:29:00+07:00'), A)).toBe(false)
    expect(dalamJamOperasi(new Date('2026-10-28T05:30:00+07:00'), A)).toBe(true)
    expect(formatDurasi(45)).toBe('45 mnt')
    expect(formatDurasi(120)).toBe('2 jam')
  })
})
