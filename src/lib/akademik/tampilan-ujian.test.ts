import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { profilKelayakan, ujianSemester } from '../../data/demo'
import { aturanUjian } from './aturan'
import { batasPengajuan, susunTampilanUjian, validasiLampiran } from './tampilan-ujian'
import type { JadwalUjianSemester } from './types'

const UTS = aturanUjian(ATURAN_BAWAAN, 'UTS')
const SUSULAN = aturanUjian(ATURAN_BAWAAN, 'SUSULAN')

describe('susunTampilanUjian', () => {
  it('data contoh UTS: layak, tidak layak, berubah, bentrok, dan beruntun', () => {
    const v = susunTampilanUjian(ujianSemester.UTS, profilKelayakan, UTS)
    expect(v.kosong).toBe(false)
    expect(v.baris.map((b) => b.sesi.kode)).toEqual(['TIF301', 'TIF303', 'TIF309', 'TIF305', 'TIF307'])
    expect(v.tidakLayak.map((b) => b.sesi.kode)).toEqual(['TIF305'])
    expect(v.tidakLayak[0].kelayakan.syarat.find((s) => !s.terpenuhi)?.alasan).toBe('Kehadiran 68%, minimal 75%')
    expect(v.layak.map((s) => s.kode)).toEqual(['TIF301', 'TIF303', 'TIF309', 'TIF307'])
    expect(v.adaKartu).toBe(true)
    expect(v.baris.filter((b) => b.berubah).map((b) => b.sesi.kode)).toEqual(['TIF303'])
    expect(v.bentrok.map((b) => [b.a.kode, b.b.kode])).toEqual([['TIF305', 'TIF307']])
    expect(v.beruntun.map((b) => [b.sebelum.kode, b.sesudah.kode, b.jedaMenit])).toEqual([['TIF303', 'TIF309', 20]])
  })

  it('tidak ada yang layak → tidak ada kartu/QR', () => {
    const v = susunTampilanUjian(ujianSemester.UTS, { ...profilKelayakan, keuanganLunas: false }, UTS)
    expect(v.layak).toEqual([])
    expect(v.adaKartu).toBe(false)
    expect(v.tidakLayak).toHaveLength(5)
    expect(v.tidakLayak.every((b) => b.kelayakan.syarat.some((s) => s.id === 'keuangan' && s.tautanPerbaikan === 'keuangan'))).toBe(true)
  })

  it('jadwal kosong', () => {
    const v = susunTampilanUjian(ujianSemester.SUSULAN, profilKelayakan, SUSULAN)
    expect(v).toMatchObject({ kosong: true, baris: [], layak: [], bentrok: [], beruntun: [], adaKartu: false })
  })

  it('"Berubah" hanya bila jadwal sebelumnya benar-benar berbeda', () => {
    const s = ujianSemester.UTS.sesi[0]
    const j: JadwalUjianSemester = { ...ujianSemester.UTS, sesi: [{ ...s, sebelumnya: { mulai: s.mulai, selesai: s.selesai, ruang: s.ruang } }] }
    expect(susunTampilanUjian(j, profilKelayakan, UTS).baris[0].berubah).toBe(false)
  })
})

describe('pengajuan susulan/remedial', () => {
  const s = ujianSemester.UTS.sesi[0]
  it('batas pengajuan = selesai ujian + N hari dari aturan', () => {
    expect(batasPengajuan(s, SUSULAN)?.toISOString()).toBe(new Date(Date.parse(s.selesai) + 7 * 86_400_000).toISOString())
    expect(batasPengajuan(s, UTS)).toBeNull()
  })

  it('validasi lampiran: tipe, ukuran, kosong; jenis tanpa lampiran menolak semua', () => {
    const MB = 1024 * 1024
    expect(validasiLampiran([{ name: 'a.pdf', size: MB, type: 'application/pdf' }], SUSULAN)).toEqual([])
    expect(validasiLampiran([{ name: 'b.exe', size: 10, type: 'application/x-msdownload' }], SUSULAN)).toEqual([{ nama: 'b.exe', alasan: 'Tipe berkas tidak diterima.' }])
    expect(validasiLampiran([{ name: 'c.png', size: 6 * MB, type: 'image/png' }], SUSULAN)).toEqual([{ nama: 'c.png', alasan: 'Ukuran melebihi 5 MB.' }])
    expect(validasiLampiran([{ name: 'd.jpg', size: 0, type: 'image/jpeg' }], SUSULAN)).toEqual([{ nama: 'd.jpg', alasan: 'Berkas kosong.' }])
    expect(validasiLampiran([{ name: 'a.pdf', size: 1, type: 'application/pdf' }], UTS)[0].alasan).toMatch(/tidak diterima/)
  })
})
