import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { aturanUjian, rubrikUntuk, validasiAturan } from './aturan'
import { tutupPendaftaran, dataPenilaianBaru, hasilUntukMahasiswa, jendelaPenilaian, kirimLembar, lembarTerlihat, peristiwaHasil, pratinjauUntukDosen, rilisHasil, semuaMengirim, validasiLembar } from './penilaian'
import type { LembarPenilaian, SesiUjian } from './types'

const PROPOSAL = aturanUjian(ATURAN_BAWAAN, 'PROPOSAL')
const RUBRIK = rubrikUntuk(ATURAN_BAWAAN, 'PROPOSAL')!
const sesi: SesiUjian = { id: 'pd1:sp', jenis: 'PROPOSAL', kode: 'ta1', nama: 'PROPOSAL', mulai: '2026-11-24T02:00:00.000Z', selesai: '2026-11-24T04:00:00.000Z', ruang: 'R. Sidang 1', petugas: ['A', 'B'] }
const SAAT = Date.parse('2026-11-24T03:00:00Z')
const skor = (n: number, p: number, k: number) => [{ kriteriaId: 'naskah', nilai: n }, { kriteriaId: 'presentasi', nilai: p }, { kriteriaId: 'penguasaan', nilai: k }]
const lembar = (pengujiId: string, extra: Partial<LembarPenilaian> = {}): LembarPenilaian => ({ pengujiId, skor: skor(80, 80, 80), catatan: {}, rekomendasi: 'LULUS', revisi: [], ...extra })
const ctx = (now = SAAT) => ({ sesi, rubrik: RUBRIK, aturan: PROPOSAL, now })

describe('konfigurasi rubrik', () => {
  it('setiap ujian akhir punya rubrik valid', () => {
    expect(validasiAturan([ATURAN_BAWAAN])).toEqual([])
    for (const j of ['PROPOSAL', 'SEMINAR_HASIL', 'UAPS', 'SIDANG'] as const) expect(rubrikUntuk(ATURAN_BAWAAN, j)).toBeTruthy()
  })
})

describe('jendela penilaian', () => {
  it('buka 30 menit sebelum mulai, tutup 24 jam setelah selesai (konfigurasi)', () => {
    expect(jendelaPenilaian(sesi, PROPOSAL, Date.parse('2026-11-24T01:29:00Z'))).toMatchObject({ terbuka: false, alasan: 'Lembar penilaian belum dibuka.' })
    expect(jendelaPenilaian(sesi, PROPOSAL, Date.parse('2026-11-24T01:30:00Z')).terbuka).toBe(true)
    expect(jendelaPenilaian(sesi, PROPOSAL, Date.parse('2026-11-25T04:00:00Z')).terbuka).toBe(true)
    expect(jendelaPenilaian(sesi, PROPOSAL, Date.parse('2026-11-25T04:01:00Z'))).toMatchObject({ terbuka: false, alasan: 'Jendela penilaian sudah ditutup.' })
  })
})

describe('validasi & pengiriman lembar', () => {
  it('skor di luar rentang, rekomendasi revisi tanpa butir, butir kosong', () => {
    expect(validasiLembar(RUBRIK, lembar('A'))).toEqual([])
    expect(validasiLembar(RUBRIK, lembar('A', { skor: skor(101, 80, 80) }))[0]).toMatch(/Kualitas naskah harus 0–100/)
    expect(validasiLembar(RUBRIK, lembar('A', { skor: skor(80, 80, 80).slice(0, 2) }))[0]).toMatch(/belum diisi/)
    expect(validasiLembar(RUBRIK, lembar('A', { rekomendasi: 'LULUS_REVISI' }))).toEqual(['Isi minimal satu butir revisi untuk rekomendasi lulus dengan revisi.'])
    expect(validasiLembar(RUBRIK, lembar('A', { revisi: [{ bagian: ' ', permintaan: 'x' }] }))).toEqual(['Revisi 1: bagian dan permintaan wajib diisi.'])
  })

  it('kirim final sekali, hanya penguji sesi, di dalam jendela; audit tercatat', () => {
    const r = kirimLembar(dataPenilaianBaru('pd1'), lembar('A'), ctx())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.lembar[0].dikirim).toBe('2026-11-24T03:00:00.000Z')
    expect(r.data.audit).toEqual([{ siapa: 'A', kapan: '2026-11-24T03:00:00.000Z', apa: 'Mengirim lembar penilaian (rekomendasi LULUS)' }])
    expect(kirimLembar(r.data, lembar('A', { skor: skor(10, 10, 10) }), ctx())).toEqual({ ok: false, galat: 'Lembar sudah dikirim dan bersifat final.' })
    expect(kirimLembar(r.data, lembar('Z'), ctx())).toEqual({ ok: false, galat: 'Anda bukan penguji ujian ini.' })
    expect(kirimLembar(dataPenilaianBaru('pd1'), lembar('A'), ctx(Date.parse('2026-11-23T00:00:00Z')))).toEqual({ ok: false, galat: 'Lembar penilaian belum dibuka.' })
    expect(kirimLembar(dataPenilaianBaru('pd1'), lembar('A', { skor: skor(-1, 80, 80) }), ctx()).ok).toBe(false)
  })
})

describe('kerahasiaan antar penguji, pratinjau, rilis', () => {
  const kirim = (...l: LembarPenilaian[]) => l.reduce((d, x) => { const r = kirimLembar(d, x, ctx()); if (!r.ok) throw new Error(r.galat); return r.data }, dataPenilaianBaru('pd1'))

  it('penguji lain tersembunyi sampai semua mengirim', () => {
    const satu = kirim(lembar('A'))
    expect(semuaMengirim(satu, sesi)).toBe(false)
    expect(lembarTerlihat(satu, sesi, 'B')).toEqual([])
    expect(lembarTerlihat(satu, sesi, 'A').map((l) => l.pengujiId)).toEqual(['A'])
    expect(pratinjauUntukDosen(satu, sesi, RUBRIK, ATURAN_BAWAAN.hurufMutu, 2)).toBeNull()
    const dua = kirim(lembar('A'), lembar('B'))
    expect(lembarTerlihat(dua, sesi, 'B').map((l) => l.pengujiId)).toEqual(['A', 'B'])
  })

  it('pratinjau berlabel perkiraan; selisih besar → perlu kesepakatan', () => {
    const d = kirim(lembar('A', { skor: skor(90, 90, 90) }), lembar('B', { skor: skor(70, 70, 70) }))
    expect(pratinjauUntukDosen(d, sesi, RUBRIK, ATURAN_BAWAAN.hurufMutu, 2)).toEqual({ perkiraan: true, nilai: 80, huruf: 'A-', perPenguji: [90, 70], perluKesepakatan: true })
  })

  it('rilis butuh semua lembar; revisi dihimpun hanya untuk lulus dengan revisi; tidak bisa rilis dua kali', () => {
    expect(rilisHasil(kirim(lembar('A')), sesi, 'LULUS', { oleh: 'prodi', now: SAAT })).toEqual({ ok: false, galat: 'Belum semua penguji mengirim lembar penilaian.' })
    const d = kirim(lembar('A', { rekomendasi: 'LULUS_REVISI', revisi: [{ bagian: 'Bab 2', permintaan: 'Tambah kajian pustaka', tenggat: '2026-12-08T00:00:00Z' }] }), lembar('B', { rekomendasi: 'LULUS_REVISI', revisi: [{ bagian: 'Bab 3', permintaan: 'Perjelas metode' }] }))
    const r = rilisHasil(d, sesi, 'LULUS_REVISI', { oleh: 'prodi', now: SAAT })
    expect(r.ok && r.data.hasil?.revisi.map((x) => [x.id, x.bagian, x.status])).toEqual([['pd1:A:1', 'Bab 2', 'BELUM'], ['pd1:B:1', 'Bab 3', 'BELUM']])
    expect(r.ok && r.data.audit.at(-1)).toEqual({ siapa: 'prodi', kapan: '2026-11-24T03:00:00.000Z', apa: 'Merilis hasil: LULUS_REVISI' })
    expect(r.ok && rilisHasil(r.data, sesi, 'LULUS', { oleh: 'prodi', now: SAAT })).toEqual({ ok: false, galat: 'Hasil sudah dirilis.' })
    const lulus = rilisHasil(d, sesi, 'LULUS', { oleh: 'prodi', now: SAAT })
    expect(lulus.ok && lulus.data.hasil?.revisi).toEqual([])
    expect(r.ok && kirimLembar(r.data, lembar('A'), ctx())).toEqual({ ok: false, galat: 'Hasil sudah dirilis.' })
  })

  it('mahasiswa: menunggu sampai rilis, tidak pernah melihat lembar/nilai per penguji', () => {
    const d = kirim(lembar('A'), lembar('B'))
    expect(hasilUntukMahasiswa(d)).toEqual({ status: 'MENUNGGU' })
    expect(hasilUntukMahasiswa(null)).toEqual({ status: 'MENUNGGU' })
    const r = rilisHasil(d, sesi, 'LULUS', { oleh: 'prodi', now: SAAT })
    const v = r.ok ? hasilUntukMahasiswa(r.data) : null
    expect(v?.status).toBe('DIRILIS')
    expect(JSON.stringify(v)).not.toMatch(/skor|pengujiId|lembar/)
  })

  it('pendaftaran ditutup (SELESAI) saat hasil dirilis', () => {
    const p = { id: 'pd1', tugasAkhirId: 'ta1', jenis: 'PROPOSAL' as const, status: 'TERJADWAL' as const, berkas: [], riwayat: [], sesi }
    expect(tutupPendaftaran(p, SAAT)).toMatchObject({ status: 'SELESAI', riwayat: [{ dari: 'TERJADWAL', ke: 'SELESAI', aksi: 'RILIS_HASIL', pelaku: 'PRODI' }] })
    expect(tutupPendaftaran({ ...p, status: 'DIBATALKAN' }, SAAT).status).toBe('DIBATALKAN')
  })

  it('peristiwa alur TA dari keputusan', () => {
    expect(peristiwaHasil('LULUS', 'UJIAN_PROPOSAL')).toBe('HASIL_LULUS')
    expect(peristiwaHasil('LULUS_REVISI', 'UJIAN_AKHIR')).toBe('HASIL_REVISI')
    expect(peristiwaHasil('TIDAK_LULUS', 'UJIAN_AKHIR')).toBe('HASIL_TIDAK_LULUS')
    expect(peristiwaHasil('LULUS', 'BIMBINGAN')).toBeNull()
  })
})
