import { describe, expect, it } from 'vitest'
import { estimasiSemester, judulMirip, kemiripan, pembimbingTersedia, sisaKuota, tokenJudul, validasiPengajuanJudul } from './judul'
import type { Dosen } from './types'

describe('kemiripan judul', () => {
  it('mengabaikan huruf besar, tanda baca, aksen, dan kata umum', () => {
    expect([...tokenJudul('Analisis Sistem Rekomendasi, Studi Kasus: Café UNPAM')]).toEqual(['rekomendasi', 'cafe', 'unpam'])
    expect(kemiripan('Sistem Rekomendasi Buku Perpustakaan', 'Aplikasi rekomendasi buku perpustakaan')).toBe(1)
    expect(kemiripan('Deteksi Wajah', 'Prediksi Harga Saham')).toBe(0)
    expect(kemiripan('', 'Apa saja')).toBe(0)
  })

  it('daftar judul mirip urut skor, di atas ambang saja', () => {
    const terdaftar = ['Sistem Rekomendasi Buku Perpustakaan Berbasis Web', 'Rekomendasi Film dengan Collaborative Filtering', 'Prediksi Kelulusan Mahasiswa']
    const out = judulMirip('Rekomendasi Buku Perpustakaan Kampus', terdaftar, 0.5)
    expect(out.map((m) => m.judul)).toEqual(['Sistem Rekomendasi Buku Perpustakaan Berbasis Web'])
    expect(out[0].skor).toBeCloseTo((2 * 3) / (4 + 4))
    expect(judulMirip('Rekomendasi Buku Perpustakaan Kampus', terdaftar, 0.2).map((m) => m.judul)).toHaveLength(2)
  })
})

describe('estimasi & kuota', () => {
  it('estimasi semester dibulatkan ke atas', () => {
    expect(estimasiSemester(0, 20)).toBe(0)
    expect(estimasiSemester(-5, 20)).toBe(0)
    expect(estimasiSemester(1, 20)).toBe(1)
    expect(estimasiSemester(26, 20)).toBe(2)
    expect(() => estimasiSemester(5, 0)).toThrow()
  })

  const dosen: Dosen[] = [
    { id: 'a', nama: 'Budi', bidang: ['RPL'], terisi: 10 },
    { id: 'b', nama: 'Ani', bidang: ['AI'], terisi: 3 },
    { id: 'c', nama: 'Cici', bidang: ['RPL'], kuota: 12, terisi: 11 },
    { id: 'd', nama: 'Dodi', bidang: ['RPL'], terisi: 2 },
  ]
  it('kuota per dosen menimpa bawaan; yang penuh tidak tersedia; sebidang didahulukan', () => {
    expect(sisaKuota(dosen[0], 10)).toBe(0)
    expect(sisaKuota(dosen[2], 10)).toBe(1)
    expect(pembimbingTersedia(dosen, 10).map((d) => d.id)).toEqual(['b', 'c', 'd'])
    expect(pembimbingTersedia(dosen, 10, 'RPL').map((d) => d.id)).toEqual(['c', 'd', 'b'])
  })

  const opsi = { maksKarakterJudul: 40, jumlahPilihan: 2, dosen, kuotaBawaan: 10 }
  const sah = { judul: 'Judul yang cukup', bidang: 'RPL', abstrak: 'x'.repeat(50), metode: 'y'.repeat(20), pilihanPembimbing: ['b', 'd'] }
  it('validasi formulir pengajuan', () => {
    expect(validasiPengajuanJudul(sah, opsi)).toEqual({})
    expect(validasiPengajuanJudul({ ...sah, judul: ' ', bidang: '', abstrak: 'pendek', metode: 'pendek', pilihanPembimbing: ['b'] }, opsi)).toEqual({
      judul: 'Judul wajib diisi.',
      bidang: 'Pilih bidang keilmuan.',
      abstrak: 'Abstrak minimal 50 karakter.',
      metode: 'Rencana metode minimal 20 karakter.',
      pilihanPembimbing: 'Pilih 2 calon pembimbing.',
    })
    expect(validasiPengajuanJudul({ ...sah, judul: 'j'.repeat(41) }, opsi).judul).toBe('Judul maksimal 40 karakter.')
    expect(validasiPengajuanJudul({ ...sah, pilihanPembimbing: ['b', 'b'] }, opsi).pilihanPembimbing).toBe('Calon pembimbing tidak boleh sama.')
    expect(validasiPengajuanJudul({ ...sah, pilihanPembimbing: ['b', 'a'] }, opsi).pilihanPembimbing).toBe('Kuota Budi sudah penuh.')
    expect(validasiPengajuanJudul({ ...sah, pilihanPembimbing: ['b', 'zz'] }, opsi).pilihanPembimbing).toBe('Calon pembimbing tidak dikenal.')
  })
})
