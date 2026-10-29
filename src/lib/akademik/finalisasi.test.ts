import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { validasiAturan } from './aturan'
import { ajukanAdmin, ajukanRevisi, bolehPengesahan, checklistAdmin, finalisasiBaru, hasilPlagiasi, lengkapiTenggat, putuskanRevisi, semuaRevisiDisetujui, simpanNaskahFinal, siapLulus, tampilRevisi, tandaiDikerjakan, validasiNaskahFinal } from './finalisasi'
import type { Finalisasi, Revisi } from './types'

const NOW = Date.parse('2026-12-01T03:00:00Z')
const r = (id: string, status: Revisi['status'], extra: Partial<Revisi> = {}): Revisi => ({ id, bagian: 'Bab 2', permintaan: 'Perbaiki', pengujiId: 'A', status, ...extra })
const ok = <T extends { ok: boolean }>(x: T) => {
  if (!x.ok) throw new Error((x as unknown as { galat: string }).galat)
  return x as Extract<T, { ok: true }>
}

describe('konfigurasi', () => {
  it('valid; kebijakan publikasi, plagiasi, admin lulus masih contoh', () => {
    expect(validasiAturan([ATURAN_BAWAAN])).toEqual([])
    expect([ATURAN_BAWAAN.naskahFinal.sumber, ATURAN_BAWAAN.plagiasi.sumber, ATURAN_BAWAAN.adminLulus.sumber]).toEqual([null, null, null])
  })
})

describe('status revisi', () => {
  it('urgensi & terlambat dari tenggat', () => {
    expect(tampilRevisi(r('1', 'BELUM', { tenggat: '2026-12-10T03:00:00Z' }), NOW)).toEqual({ status: 'BELUM', terlambat: false, sisaHari: 9, urgensi: 0 })
    expect(tampilRevisi(r('1', 'DIKERJAKAN', { tenggat: '2026-12-03T03:00:00Z' }), NOW)).toMatchObject({ urgensi: 1, sisaHari: 2 })
    expect(tampilRevisi(r('1', 'DIAJUKAN', { tenggat: '2026-11-30T03:00:00Z' }), NOW)).toMatchObject({ terlambat: true, urgensi: 2 })
    expect(tampilRevisi(r('1', 'DISETUJUI', { tenggat: '2026-11-30T03:00:00Z' }), NOW)).toMatchObject({ terlambat: false, urgensi: 0 })
    expect(tampilRevisi(r('1', 'BELUM'), NOW)).toMatchObject({ sisaHari: null, urgensi: 0 })
  })

  it('tenggat bawaan dari konfigurasi bila penguji tidak menetapkan', () => {
    const out = lengkapiTenggat([r('1', 'BELUM'), r('2', 'BELUM', { tenggat: '2026-12-05T00:00:00Z' })], '2026-12-01T00:00:00Z', ATURAN_BAWAAN)
    expect(out.map((x) => x.tenggat)).toEqual(['2026-12-31T00:00:00.000Z', '2026-12-05T00:00:00Z'])
  })

  it('alur: belum → dikerjakan → diajukan (wajib versi & catatan) → disetujui/ditolak (alasan) → ajukan ulang', () => {
    let rv = [r('1', 'BELUM')]
    rv = ok(tandaiDikerjakan(rv, '1')).revisi
    expect(ajukanRevisi(rv, '1', { catatan: 'x' })).toEqual({ ok: false, galat: 'Pilih versi draf yang memuat perbaikan.' })
    expect(ajukanRevisi(rv, '1', { versiDraf: 3, catatan: ' ' })).toEqual({ ok: false, galat: 'Jelaskan perbaikan yang dilakukan.' })
    rv = ok(ajukanRevisi(rv, '1', { versiDraf: 3, catatan: 'Sudah ditambah' })).revisi
    expect(rv[0]).toMatchObject({ status: 'DIAJUKAN', versiDraf: 3, catatanMahasiswa: 'Sudah ditambah' })
    expect(putuskanRevisi(rv, '1', 'B', 'DISETUJUI', undefined, NOW)).toEqual({ ok: false, galat: 'Hanya penguji yang meminta revisi ini yang dapat memutuskan.' })
    expect(putuskanRevisi(rv, '1', 'A', 'DITOLAK', ' ', NOW)).toEqual({ ok: false, galat: 'Alasan penolakan wajib diisi.' })
    rv = ok(putuskanRevisi(rv, '1', 'A', 'DITOLAK', 'Belum lengkap', NOW)).revisi
    expect(rv[0]).toMatchObject({ status: 'DITOLAK', alasan: 'Belum lengkap' })
    rv = ok(ajukanRevisi(rv, '1', { versiDraf: 4, catatan: 'Dilengkapi' })).revisi
    rv = ok(putuskanRevisi(rv, '1', 'A', 'DISETUJUI', undefined, NOW)).revisi
    expect(rv[0]).toMatchObject({ status: 'DISETUJUI', diputuskan: '2026-12-01T03:00:00.000Z' })
    expect(rv[0].alasan).toBeUndefined()
    expect(ajukanRevisi(rv, '1', { versiDraf: 5, catatan: 'x' }).ok).toBe(false)
    expect(putuskanRevisi([r('1', 'BELUM')], '1', 'A', 'DISETUJUI', undefined, NOW)).toEqual({ ok: false, galat: 'Butir belum diajukan mahasiswa.' })
    expect(tandaiDikerjakan(rv, 'x')).toEqual({ ok: false, galat: 'Butir revisi tidak ditemukan.' })
  })

  it('lembar pengesahan tidak bisa dibuat selama ada revisi terbuka', () => {
    expect(bolehPengesahan([r('1', 'DISETUJUI'), r('2', 'DIAJUKAN')])).toEqual({ ok: false, alasan: 'Masih ada 1 butir revisi yang belum disetujui.' })
    expect(bolehPengesahan([r('1', 'DISETUJUI')])).toEqual({ ok: true })
    expect(bolehPengesahan([])).toEqual({ ok: true })
    expect(semuaRevisiDisetujui([r('1', 'DITOLAK')])).toBe(false)
  })
})

describe('naskah final & plagiasi', () => {
  const semua = ATURAN_BAWAAN.naskahFinal.daftarPeriksa
  it('validasi PDF, ukuran, daftar periksa lengkap, akses dari konfigurasi', () => {
    expect(validasiNaskahFinal({ size: 1000, type: 'application/pdf' }, semua, 'terbuka', ATURAN_BAWAAN)).toEqual([])
    const g = validasiNaskahFinal({ size: 31 * 1024 * 1024, type: 'application/msword' }, semua.slice(1), 'selamanya', ATURAN_BAWAAN)
    expect(g).toEqual(['Naskah final harus PDF.', 'Ukuran melebihi 30 MB.', `Daftar periksa belum lengkap: ${semua[0]}.`, 'Pilih hak akses publikasi.'])
  })

  it('struk menyimpan hash; naskah baru membatalkan hasil plagiasi lama', () => {
    const fin: Finalisasi = { ...finalisasiBaru('ta1'), plagiasi: hasilPlagiasi(10, { nama: 'x', contoh: true }, ATURAN_BAWAAN, NOW) }
    const n = simpanNaskahFinal(fin, { nama: 'final.pdf', ukuran: 1, sha256: 'a'.repeat(64), akses: 'terbuka', daftarPeriksa: semua }, NOW)
    expect(n.naskah).toMatchObject({ sha256: 'a'.repeat(64), diunggah: '2026-12-01T03:00:00.000Z' })
    expect(n.plagiasi).toBeUndefined()
    expect(() => simpanNaskahFinal(fin, { nama: 'x', ukuran: 1, sha256: 'zz', akses: 'terbuka', daftarPeriksa: [] }, NOW)).toThrow(/Hash/)
  })

  it('hasil plagiasi memakai ambang konfigurasi (batas inklusif) dan label penyedia contoh', () => {
    expect(hasilPlagiasi(25, { nama: 'Penyedia contoh', contoh: true }, ATURAN_BAWAAN, NOW)).toEqual({ penyedia: 'Penyedia contoh', persen: 25, ambang: 25, lolos: true, waktu: '2026-12-01T03:00:00.000Z', contoh: true })
    expect(hasilPlagiasi(26, { nama: 'p', contoh: false }, ATURAN_BAWAAN, NOW).lolos).toBe(false)
  })
})

describe('administrasi lulus', () => {
  const lengkap = (fin: Finalisasi): Finalisasi => ({ ...fin, admin: Object.fromEntries(ATURAN_BAWAAN.adminLulus.item.map((i) => [i.id, { status: 'SELESAI' as const }])) })
  const naskah = { nama: 'f.pdf', ukuran: 1, sha256: 'a'.repeat(64), diunggah: '', akses: 'terbuka', daftarPeriksa: [] }

  it('checklist dari konfigurasi; ajukan item; item asing ditolak', () => {
    const fin = ajukanAdmin(finalisasiBaru('ta1'), 'bebas-pustaka', ATURAN_BAWAAN)
    expect(checklistAdmin(fin, ATURAN_BAWAAN).slice(0, 2).map((b) => [b.id, b.status])).toEqual([['bebas-pustaka', 'DIAJUKAN'], ['bebas-keuangan', 'BELUM']])
    expect(() => ajukanAdmin(fin, 'asing', ATURAN_BAWAAN)).toThrow()
    const selesai = { ...fin, admin: { 'bebas-pustaka': { status: 'SELESAI' as const } } }
    expect(ajukanAdmin(selesai, 'bebas-pustaka', ATURAN_BAWAAN)).toBe(selesai)
  })

  it('menolak "selesai" bila ada yang kurang; lengkap → ok', () => {
    const kosong = siapLulus(finalisasiBaru('ta1'), [r('1', 'DIAJUKAN')], ATURAN_BAWAAN)
    expect(kosong.ok).toBe(false)
    expect(kosong.kurang.slice(0, 3)).toEqual(['Revisi belum semua disetujui', 'Naskah final belum diunggah', 'Pemeriksaan kemiripan belum dilakukan'])
    expect(kosong.kurang).toContain('Bebas pustaka belum selesai')
    const tinggi = siapLulus(lengkap({ ...finalisasiBaru('ta1'), naskah, plagiasi: hasilPlagiasi(40, { nama: 'p', contoh: true }, ATURAN_BAWAAN, NOW) }), [], ATURAN_BAWAAN)
    expect(tinggi.kurang).toEqual(['Kemiripan 40% melebihi ambang 25%'])
    const semuaOk = siapLulus(lengkap({ ...finalisasiBaru('ta1'), naskah, plagiasi: hasilPlagiasi(12, { nama: 'p', contoh: true }, ATURAN_BAWAAN, NOW) }), [r('1', 'DISETUJUI')], ATURAN_BAWAAN)
    expect(semuaOk).toEqual({ ok: true, kurang: [] })
  })
})
