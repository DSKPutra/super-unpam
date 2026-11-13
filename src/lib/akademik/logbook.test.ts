import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { buatIcsTenggat } from './ics-ujian'
import { bimbinganSah, cekJedaBimbingan, sha256Hex, tambahVersi, targetBimbingan, ujianBerikutnya, validasiBerkasDraf, validasiEntri, VersiDitolak } from './logbook'
import type { Bimbingan, VersiDraf } from './types'

const e = (id: string, tanggal: string, status: Bimbingan['status']): Bimbingan => ({ id, tugasAkhirId: 'ta', tanggal, bagian: 'Bab 1', ringkasan: 'Ringkasan arahan dosen yang cukup panjang', status })
const NOW = Date.parse('2026-10-28T03:00:00Z')

describe('penghitung bimbingan sah', () => {
  const entri = [e('1', '2026-09-01T03:00:00Z', 'DISETUJUI'), e('2', '2026-09-15T03:00:00Z', 'MENUNGGU'), e('3', '2026-09-29T03:00:00Z', 'DITOLAK'), e('4', '2026-10-06T03:00:00Z', 'DISETUJUI')]

  it('hanya entri disetujui yang dihitung', () => {
    expect(bimbinganSah(entri).map((x) => x.id)).toEqual(['1', '4'])
  })

  it('target mengikuti ujian berikutnya dan minimum dari konfigurasi', () => {
    expect(targetBimbingan(entri, 'BIMBINGAN', ATURAN_BAWAAN)).toEqual({ jenis: 'PROPOSAL', namaUjian: 'Seminar Proposal', minimal: 4, sah: 2, terpenuhi: false, contoh: true })
    expect(targetBimbingan(entri, 'PENELITIAN', ATURAN_BAWAAN)).toMatchObject({ jenis: 'SIDANG', minimal: 8, sah: 2 })
    expect(targetBimbingan(entri, 'DIAJUKAN', ATURAN_BAWAAN)).toBeNull()
    const cukup = [...entri, e('5', '2026-10-13T03:00:00Z', 'DISETUJUI'), e('6', '2026-10-20T03:00:00Z', 'DISETUJUI')]
    expect(targetBimbingan(cukup, 'BIMBINGAN', ATURAN_BAWAAN)?.terpenuhi).toBe(true)
  })

  it('ujian berikutnya per tahap', () => {
    expect(ujianBerikutnya('LAYAK_PROPOSAL')).toBe('PROPOSAL')
    expect(ujianBerikutnya('REVISI_PROPOSAL')).toBe('SIDANG')
    expect(ujianBerikutnya('YUDISIUM')).toBeNull()
  })
})

describe('pengingat jeda bimbingan', () => {
  it('dari entri terakhir (status apa pun), lebih dari ambang → perlu', () => {
    expect(cekJedaBimbingan([e('1', '2026-10-01T03:00:00Z', 'DISETUJUI'), e('2', '2026-10-06T03:00:00Z', 'MENUNGGU')], undefined, 21, NOW)).toEqual({ perlu: true, hari: 22 })
    expect(cekJedaBimbingan([e('1', '2026-10-07T03:00:00Z', 'DITOLAK')], undefined, 21, NOW)).toEqual({ perlu: false, hari: 21 })
  })
  it('tanpa entri: dihitung dari saat bimbingan dimulai; tanpa acuan → null', () => {
    expect(cekJedaBimbingan([], '2026-09-01T03:00:00Z', 21, NOW)).toEqual({ perlu: true, hari: 57 })
    expect(cekJedaBimbingan([], undefined, 21, NOW)).toBeNull()
  })
})

describe('validasi entri', () => {
  it('tanggal, bagian, ringkasan, tenggat', () => {
    expect(validasiEntri({ tanggal: '2026-10-27T03:00:00Z', bagian: 'Bab 2', ringkasan: 'Perbaiki rumusan masalah dan batasan', tugasBerikutnya: { teks: 'x', tenggat: '2026-11-03T03:00:00Z' } }, NOW)).toEqual({})
    expect(validasiEntri({ tanggal: '', bagian: ' ', ringkasan: 'pendek' }, NOW)).toEqual({ tanggal: 'Tanggal bimbingan wajib diisi.', bagian: 'Bagian yang dibahas wajib diisi.', ringkasan: 'Ringkasan arahan minimal 20 karakter.' })
    expect(validasiEntri({ tanggal: '2026-11-01T03:00:00Z', bagian: 'a', ringkasan: 'r'.repeat(20) }, NOW).tanggal).toMatch(/masa depan/)
    expect(validasiEntri({ tanggal: '2026-10-27T03:00:00Z', bagian: 'a', ringkasan: 'r'.repeat(20), tugasBerikutnya: { teks: 'x', tenggat: '2026-10-26T03:00:00Z' } }, NOW).tenggat).toMatch(/setelah tanggal/)
  })
})

describe('versi draf tidak bisa ditimpa', () => {
  const h = (c: string) => c.repeat(64)
  const berkas = (sha: string, catatan = 'Revisi bab 1') => ({ nama: 'draf.pdf', ukuran: 1000, tipe: 'application/pdf', sha256: sha, catatan })

  it('nomor versi selalu naik dan versi lama tetap ada', () => {
    const v1 = tambahVersi([], berkas(h('a')), new Date('2026-10-01T00:00:00Z'))
    const v2 = tambahVersi(v1, berkas(h('b')))
    expect(v2.map((v) => v.versi)).toEqual([1, 2])
    expect(v2[0]).toEqual(v1[0])
    expect(v1).toHaveLength(1)
  })

  it('isi identik dengan versi terakhir, hash rusak, atau tanpa catatan ditolak', () => {
    const v1 = tambahVersi([], berkas(h('a')))
    expect(() => tambahVersi(v1, berkas(h('a')))).toThrow(new VersiDitolak('Isi berkas sama dengan versi v1.'))
    expect(() => tambahVersi(v1, berkas('xyz'))).toThrow(/tidak valid/)
    expect(() => tambahVersi(v1, berkas(h('c'), '  '))).toThrow(/Catatan/)
    // Isi yang sama dengan versi LAMA (bukan terakhir) boleh, mis. mengembalikan ke draf sebelumnya.
    const v2 = tambahVersi(v1, berkas(h('b')))
    expect(tambahVersi(v2, berkas(h('a'))).map((v) => v.versi)).toEqual([1, 2, 3])
  })

  it('nomor berikutnya dari versi tertinggi walau urutan larik acak', () => {
    const acak: VersiDraf[] = [{ ...berkas(h('c')), versi: 3, diunggah: '' }, { ...berkas(h('a')), versi: 1, diunggah: '' }]
    expect(tambahVersi(acak, berkas(h('d'))).at(-1)?.versi).toBe(4)
  })

  it('validasi berkas dari konfigurasi', () => {
    expect(validasiBerkasDraf({ size: 1, type: 'application/pdf' }, ATURAN_BAWAAN)).toBeNull()
    expect(validasiBerkasDraf({ size: 1, type: 'image/png' }, ATURAN_BAWAAN)).toMatch(/Tipe/)
    expect(validasiBerkasDraf({ size: 0, type: 'application/pdf' }, ATURAN_BAWAAN)).toMatch(/kosong/)
    expect(validasiBerkasDraf({ size: 21 * 1024 * 1024, type: 'application/pdf' }, ATURAN_BAWAAN)).toMatch(/20 MB/)
  })

  it('SHA-256 sesuai vektor uji standar', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc').buffer as ArrayBuffer)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('.ics tenggat', () => {
  it('acara 30 menit dengan alarm, uid aman', () => {
    const ics = buatIcsTenggat([{ id: 'bimbingan:e1/tugas', jenis: 'tugas', judul: 'Revisi Bab 2', waktu: '2026-11-03T03:00:00.000Z' }], new Date('2026-10-28T00:00:00Z'))
    expect(ics).toContain('UID:bimbingan-e1-tugas@super-unpam')
    expect(ics).toContain('DTSTART:20261103T030000Z\r\nDURATION:PT30M')
    expect(ics).toContain('TRIGGER:-P1D')
  })
})
