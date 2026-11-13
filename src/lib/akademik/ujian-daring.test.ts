import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { validasiAturan } from './aturan'
import { fase, offsetServer, sesiUntukKlien, terimaKiriman, type BerkasJawaban, type SesiDaring } from './ujian-daring'

const T = (iso: string) => Date.parse(iso)
const sesi: SesiDaring = { id: 's1', kodeMK: 'IF301', namaMK: 'Basis Data', jenis: 'UTS', mulai: '2026-11-24T02:00:00Z', selesai: '2026-11-24T04:00:00Z', perpanjanganMenit: 0, soal: { nama: 'soal.pdf', url: '/soal' } }
const berkas = (kunci: string, sha = 'a'): BerkasJawaban => ({ kunci, nama: 'jawaban.pdf', ukuran: 1000, tipe: 'application/pdf', sha256: sha.repeat(64) })

describe('konfigurasi', () => {
  it('nonaktif sampai kampus memutuskan; perekaman tidak bisa dinyalakan lewat nilai', () => {
    expect(validasiAturan([ATURAN_BAWAAN])).toEqual([])
    expect(ATURAN_BAWAAN.ujianDaring).toMatchObject({ aktif: false, perekaman: false, sumber: null })
  })
})

describe('waktu dari server', () => {
  it('fase mengikuti jam server, perpanjangan akomodasi dibatasi aturan, lalu toleransi', () => {
    expect(fase(sesi, T('2026-11-24T01:59:00Z'), ATURAN_BAWAAN)).toEqual({ fase: 'BELUM', sisaMs: 60_000 })
    expect(fase(sesi, T('2026-11-24T03:59:00Z'), ATURAN_BAWAAN).fase).toBe('BERLANGSUNG')
    expect(fase(sesi, T('2026-11-24T04:00:30Z'), ATURAN_BAWAAN)).toEqual({ fase: 'TOLERANSI', sisaMs: 30_000 })
    expect(fase(sesi, T('2026-11-24T04:01:00Z'), ATURAN_BAWAAN).fase).toBe('DITUTUP')
    expect(fase({ ...sesi, perpanjanganMenit: 30 }, T('2026-11-24T04:20:00Z'), ATURAN_BAWAAN).fase).toBe('BERLANGSUNG')
    expect(fase({ ...sesi, perpanjanganMenit: 999 }, T('2026-11-24T05:01:01Z'), ATURAN_BAWAAN).fase).toBe('DITUTUP')
  })

  it('soal disembunyikan sebelum mulai; offset jam dari titik tengah tempuh', () => {
    expect(sesiUntukKlien(sesi, T('2026-11-24T01:00:00Z'), ATURAN_BAWAAN).soal).toBeUndefined()
    expect(sesiUntukKlien(sesi, T('2026-11-24T02:00:00Z'), ATURAN_BAWAAN).soal).toBeDefined()
    expect(offsetServer('2026-11-24T02:00:05.000Z', T('2026-11-24T02:00:00Z'), T('2026-11-24T02:00:02Z'))).toBe(4000)
  })
})

describe('pengiriman idempoten', () => {
  const now = T('2026-11-24T03:00:00Z')

  it('kirim ulang dengan kunci sama tidak menggandakan; kunci baru = versi baru', () => {
    const a = terimaKiriman([], berkas('kunci-0001'), sesi, now, ATURAN_BAWAAN)
    if (!a.ok) throw new Error(a.galat)
    expect(a).toMatchObject({ baru: true, kiriman: { versi: 1, diterima: '2026-11-24T03:00:00.000Z' } })
    // Sambungan putus setelah server menerima → klien mengirim ulang dengan kunci sama, bahkan setelah waktu habis.
    const ulang = terimaKiriman(a.daftar, berkas('kunci-0001'), sesi, T('2026-11-24T06:00:00Z'), ATURAN_BAWAAN)
    expect(ulang).toEqual({ ok: true, kiriman: a.kiriman, daftar: a.daftar, baru: false })
    const b = terimaKiriman(a.daftar, berkas('kunci-0002', 'b'), sesi, now + 1000, ATURAN_BAWAAN)
    if (!b.ok) throw new Error(b.galat)
    expect(b.daftar.map((k) => k.versi)).toEqual([1, 2])
    expect(terimaKiriman(b.daftar, berkas('kunci-0001', 'c'), sesi, now, ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Kunci pengiriman sudah dipakai untuk berkas lain.' })
  })

  it('menolak di luar waktu dan berkas tidak sah', () => {
    expect(terimaKiriman([], berkas('kunci-0001'), sesi, T('2026-11-24T01:00:00Z'), ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Ujian belum dimulai.' })
    expect(terimaKiriman([], berkas('kunci-0001'), sesi, T('2026-11-24T04:00:59Z'), ATURAN_BAWAAN).ok).toBe(true)
    expect(terimaKiriman([], berkas('kunci-0001'), sesi, T('2026-11-24T04:01:00Z'), ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Waktu pengiriman sudah ditutup.' })
    expect(terimaKiriman([], { ...berkas('kunci-0001'), tipe: 'application/zip' }, sesi, now, ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Jenis berkas tidak diterima.' })
    expect(terimaKiriman([], berkas('x'), sesi, now, ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Kunci pengiriman tidak valid.' })
    expect(terimaKiriman([], { ...berkas('kunci-0001'), ukuran: 21 * 1024 * 1024 }, sesi, now, ATURAN_BAWAAN).ok).toBe(false)
  })
})
