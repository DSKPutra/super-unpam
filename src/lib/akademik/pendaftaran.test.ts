import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { profilKelayakan } from '../../data/demo'
import { aturanUjian, validasiAturan } from './aturan'
import { evaluasiKelayakan } from './kelayakan'
import { aksiTersedia, checklistBerkas, peristiwaAlurUntuk, jenisTersedia, profilUjianAkhir, siapKirim, TABEL_PENDAFTARAN, transisiPendaftaran, unggahBerkas, validasiBerkasUjian, validasiSlot, verifikasiBerkas, type AksiPendaftaran, type KonteksPendaftaran } from './pendaftaran'
import type { BerkasUjian, PendaftaranUjianAkhir, PeranAlur, SesiUjian, SlotUjian, StatusPendaftaran } from './types'

const NOW = Date.parse('2026-10-29T03:00:00Z')
const PROPOSAL = aturanUjian(ATURAN_BAWAAN, 'PROPOSAL')
const p = (status: StatusPendaftaran, extra: Partial<PendaftaranUjianAkhir> = {}): PendaftaranUjianAkhir => ({ id: 'pd1', tugasAkhirId: 'ta1', jenis: 'PROPOSAL', status, berkas: [], riwayat: [], ...extra })
const slot = (mulai: string, extra: Partial<SlotUjian> = {}): SlotUjian => ({ id: 's1', jenis: 'PROPOSAL', mulai, selesai: new Date(Date.parse(mulai) + 2 * 3_600_000).toISOString(), ruang: 'R. Sidang 1', kapasitas: 4, terisi: 1, penguji: ['dsn-andi', 'dsn-hadi'], ...extra })
const k = (pelaku: PeranAlur, extra: Partial<KonteksPendaftaran> = {}): KonteksPendaftaran => ({ pelaku, layak: true, catatan: 'Alasan', sekarang: NOW, aturan: PROPOSAL, slot: slot('2026-11-20T02:00:00Z'), ...extra })
const berkas = (id: string, status: BerkasUjian['status'], diunggah = '2026-10-20T00:00:00Z'): BerkasUjian => ({ id, nama: `${id}.pdf`, ukuran: 1, tipe: 'application/pdf', sha256: 'a'.repeat(64), diunggah, status })

describe('konfigurasi berkas', () => {
  it('berkas wajib di syarat ada di checklist; yang hilang ditolak validasi', () => {
    expect(validasiAturan([ATURAN_BAWAAN])).toEqual([])
    const rusak = { ...ATURAN_BAWAAN, ujian: ATURAN_BAWAAN.ujian.map((u) => (u.jenis === 'PROPOSAL' ? { ...u, berkas: u.berkas!.filter((b) => b.id !== 'lembar-persetujuan') } : u)) }
    expect(validasiAturan([rusak]).join()).toMatch(/berkas wajib "lembar-persetujuan" tidak ada di checklist/)
  })
})

describe('mesin status pendaftaran', () => {
  const STATUS: StatusPendaftaran[] = ['DRAF', 'MENUNGGU_PEMBIMBING', 'DIVERIFIKASI_PRODI', 'TERJADWAL', 'DIBATALKAN']
  const PERAN: PeranAlur[] = ['MAHASISWA', 'DOSEN', 'PRODI']

  const lengkap = [berkas('naskah-proposal', 'DIVERIFIKASI'), berkas('lembar-persetujuan', 'DIVERIFIKASI')]
  it('semua kombinasi status × aksi × peran: hanya yang ada di tabel yang sah', () => {
    for (const s of STATUS)
      for (const aksi of Object.keys(TABEL_PENDAFTARAN) as AksiPendaftaran[])
        for (const pelaku of PERAN) {
          const a = TABEL_PENDAFTARAN[aksi]
          const r = transisiPendaftaran(p(s, { berkas: lengkap }), aksi, k(pelaku))
          expect(r.ok).toBe(a.dari.includes(s) && a.pelaku.includes(pelaku))
          if (r.ok) expect(r.p.status).toBe(a.ke)
        }
  })

  it('alur lengkap: kirim → disetujui → pilih slot → terjadwal, riwayat tercatat', () => {
    let cur = p('DRAF', { berkas: lengkap })
    for (const [aksi, pelaku] of [['KIRIM', 'MAHASISWA'], ['SETUJUI_PEMBIMBING', 'DOSEN'], ['PILIH_SLOT', 'MAHASISWA']] as const) {
      const r = transisiPendaftaran(cur, aksi, k(pelaku, { catatan: undefined }))
      if (!r.ok) throw new Error(r.galat)
      cur = r.p
    }
    expect(cur.status).toBe('TERJADWAL')
    expect(cur.sesi).toMatchObject({ mulai: '2026-11-20T02:00:00Z', ruang: 'R. Sidang 1', petugas: ['dsn-andi', 'dsn-hadi'] })
    expect(cur.riwayat.map((r) => r.aksi)).toEqual(['KIRIM', 'SETUJUI_PEMBIMBING', 'PILIH_SLOT'])
  })

  it('penjaga: pembimbing tidak bisa menyetujui sebelum berkas wajib terverifikasi; slot butuh kelayakan penuh', () => {
    expect(transisiPendaftaran(p('MENUNGGU_PEMBIMBING', { berkas: [berkas('naskah-proposal', 'DIVERIFIKASI'), berkas('lembar-persetujuan', 'DIUNGGAH')] }), 'SETUJUI_PEMBIMBING', k('DOSEN'))).toEqual({ ok: false, galat: 'Semua berkas wajib harus diverifikasi lebih dulu.' })
    expect(transisiPendaftaran(p('DIVERIFIKASI_PRODI'), 'PILIH_SLOT', k('MAHASISWA', { layak: false }))).toEqual({ ok: false, galat: 'Syarat ujian belum terpenuhi.' })
  })

  it('penjaga: belum layak, tolak tanpa alasan, slot kosong/salah jenis', () => {
    expect(transisiPendaftaran(p('DRAF'), 'KIRIM', k('MAHASISWA', { layak: false }))).toEqual({ ok: false, galat: 'Syarat pendaftaran belum terpenuhi.' })
    expect(transisiPendaftaran(p('MENUNGGU_PEMBIMBING'), 'TOLAK_PEMBIMBING', k('DOSEN', { catatan: ' ' }))).toEqual({ ok: false, galat: 'Alasan wajib diisi.' })
    expect(transisiPendaftaran(p('DIVERIFIKASI_PRODI'), 'PILIH_SLOT', k('MAHASISWA', { slot: undefined }))).toEqual({ ok: false, galat: 'Slot belum dipilih.' })
    expect(transisiPendaftaran(p('DIVERIFIKASI_PRODI'), 'PILIH_SLOT', k('MAHASISWA', { slot: slot('2026-11-20T02:00:00Z', { jenis: 'SIDANG' }) }))).toEqual({ ok: false, galat: 'Slot bukan untuk jenis ujian ini.' })
  })

  it('batal & jadwal ulang hanya sebelum batas jam konfigurasi; jadwal dilepas', () => {
    const terjadwal = (mulai: string) => p('TERJADWAL', { sesi: { id: 'x', jenis: 'PROPOSAL', kode: 'ta1', nama: 'PROPOSAL', mulai, selesai: mulai, ruang: 'R', petugas: [] } })
    const jauh = new Date(NOW + 49 * 3_600_000).toISOString()
    const dekat = new Date(NOW + 47 * 3_600_000).toISOString()
    const ulang = transisiPendaftaran(terjadwal(jauh), 'JADWAL_ULANG', k('MAHASISWA'))
    expect(ulang.ok && ulang.p.status === 'DIVERIFIKASI_PRODI' && ulang.p.sesi === undefined).toBe(true)
    expect(transisiPendaftaran(terjadwal(dekat), 'JADWAL_ULANG', k('MAHASISWA'))).toEqual({ ok: false, galat: 'Sudah melewati batas 48 jam sebelum ujian.' })
    expect(transisiPendaftaran(terjadwal(dekat), 'BATALKAN', k('MAHASISWA')).ok).toBe(false)
    expect(transisiPendaftaran(p('MENUNGGU_PEMBIMBING'), 'BATALKAN', k('MAHASISWA')).ok).toBe(true)
  })

  it('aksi tersedia per peran', () => {
    expect(aksiTersedia('MENUNGGU_PEMBIMBING', 'DOSEN')).toEqual(['SETUJUI_PEMBIMBING', 'TOLAK_PEMBIMBING'])
    expect(aksiTersedia('TERJADWAL', 'MAHASISWA')).toEqual(['JADWAL_ULANG', 'BATALKAN'])
    expect(aksiTersedia('DIBATALKAN', 'MAHASISWA')).toEqual([])
  })
})

describe('kelayakan pendaftaran (semua kombinasi syarat)', () => {
  // Syarat PROPOSAL contoh: bimbingan ≥ 4, persetujuan pembimbing, keuangan, berkas wajib (2).
  const terverifikasi = [berkas('naskah-proposal', 'DIVERIFIKASI'), berkas('lembar-persetujuan', 'DIVERIFIKASI')]
  it('setiap kombinasi bimbingan × keuangan × berkas × persetujuan', () => {
    for (const sah of [3, 4])
      for (const lunas of [false, true])
        for (const lengkap of [false, true])
          for (const setuju of [false, true]) {
            const pd = p(setuju ? 'DIVERIFIKASI_PRODI' : 'MENUNGGU_PEMBIMBING', { berkas: lengkap ? terverifikasi : terverifikasi.slice(0, 1) })
            const h = evaluasiKelayakan(profilUjianAkhir({ ...profilKelayakan, keuanganLunas: lunas }, sah, pd), PROPOSAL)
            expect(h.layak).toBe(sah >= 4 && lunas && lengkap && setuju)
          }
  })

  it('berkas yang diunggah tapi belum diverifikasi atau ditolak tidak dihitung', () => {
    const pd = p('DIVERIFIKASI_PRODI', { berkas: [berkas('naskah-proposal', 'DIUNGGAH'), berkas('lembar-persetujuan', 'DITOLAK')] })
    expect(profilUjianAkhir(profilKelayakan, 4, pd).berkas).toEqual([])
    expect(profilUjianAkhir(profilKelayakan, 4, null)).toMatchObject({ persetujuanPembimbing: false, berkas: [], bimbinganDisetujui: 4 })
  })
})

describe('checklist & berkas', () => {
  it('status per berkas dari unggahan terakhir; yang belum diunggah BELUM', () => {
    const rows = checklistBerkas(PROPOSAL, [berkas('naskah-proposal', 'DITOLAK', '2026-10-10T00:00:00Z'), berkas('naskah-proposal', 'DIUNGGAH', '2026-10-21T00:00:00Z')])
    expect(rows.map((r) => [r.aturan.id, r.status])).toEqual([['naskah-proposal', 'DIUNGGAH'], ['lembar-persetujuan', 'BELUM'], ['kartu-bimbingan', 'BELUM']])
  })
  it('validasi tipe & ukuran per aturan berkas', () => {
    const a = PROPOSAL.berkas![1]
    expect(validasiBerkasUjian({ size: 1, type: 'image/png' }, a)).toBeNull()
    expect(validasiBerkasUjian({ size: 1, type: 'application/zip' }, a)).toMatch(/Tipe/)
    expect(validasiBerkasUjian({ size: 3 * 1024 * 1024, type: 'application/pdf' }, a)).toMatch(/2 MB/)
  })
})

describe('slot & bentrok', () => {
  const sesi = (id: string, mulai: string, selesai: string, petugas: string[] = []): SesiUjian => ({ id, jenis: 'UAS', kode: id, nama: id, mulai, selesai, ruang: 'R', petugas })
  const s = slot('2026-11-20T02:00:00Z')
  it('slot valid', () => expect(validasiSlot(s, [], [], NOW)).toBeNull())
  it('lewat, penuh', () => {
    expect(validasiSlot(slot('2026-10-01T02:00:00Z'), [], [], NOW)).toBe('Slot sudah lewat.')
    expect(validasiSlot({ ...s, terisi: 4 }, [], [], NOW)).toBe('Slot sudah penuh.')
  })
  it('bentrok mahasiswa dan penguji; bersinggungan di batas tidak bentrok', () => {
    expect(validasiSlot(s, [sesi('UAS Basis Data', '2026-11-20T03:00:00Z', '2026-11-20T05:00:00Z')], [], NOW)).toBe('Bentrok dengan jadwal Anda: UAS Basis Data.')
    expect(validasiSlot(s, [sesi('x', '2026-11-20T04:00:00Z', '2026-11-20T05:00:00Z')], [], NOW)).toBeNull()
    expect(validasiSlot(s, [], [sesi('ujian lain', '2026-11-20T01:00:00Z', '2026-11-20T03:00:00Z', ['dsn-hadi'])], NOW)).toMatch(/Penguji/)
    expect(validasiSlot(s, [], [sesi('ujian lain', '2026-11-20T01:00:00Z', '2026-11-20T03:00:00Z', ['dsn-lain'])], NOW)).toBeNull()
  })
})

describe('jenis ujian per tahap', () => {
  it('proposal saat bimbingan; seminar hasil/UAPS/sidang saat penelitian; lainnya tidak ada', () => {
    expect(jenisTersedia('BIMBINGAN', ATURAN_BAWAAN)).toEqual(['PROPOSAL'])
    expect(jenisTersedia('PENELITIAN', ATURAN_BAWAAN)).toEqual(['SEMINAR_HASIL', 'UAPS', 'SIDANG'])
    expect(jenisTersedia('DIAJUKAN', ATURAN_BAWAAN)).toEqual([])
    expect(jenisTersedia('PENELITIAN', { ...ATURAN_BAWAAN, ujian: ATURAN_BAWAAN.ujian.filter((u) => u.jenis !== 'UAPS') })).toEqual(['SEMINAR_HASIL', 'SIDANG'])
  })
})

describe('berkas: unggah, verifikasi, siap kirim', () => {
  const meta = (id: string, sha = 'b'.repeat(64)) => ({ id, nama: `${id}.pdf`, ukuran: 1000, tipe: 'application/pdf', sha256: sha })

  it('unggah hanya saat DRAF, sesuai aturan, unggahan lama tetap', () => {
    const r1 = unggahBerkas(p('DRAF'), meta('naskah-proposal'), PROPOSAL, NOW)
    expect(r1.ok).toBe(true)
    const r2 = r1.ok ? unggahBerkas(r1.p, meta('naskah-proposal', 'c'.repeat(64)), PROPOSAL, NOW + 1000) : r1
    expect(r2.ok && r2.p.berkas).toHaveLength(2)
    expect(unggahBerkas(p('MENUNGGU_PEMBIMBING'), meta('naskah-proposal'), PROPOSAL, NOW)).toEqual({ ok: false, galat: 'Berkas hanya bisa diubah sebelum diajukan ke pembimbing.' })
    expect(unggahBerkas(p('DRAF'), meta('asing'), PROPOSAL, NOW)).toEqual({ ok: false, galat: 'Jenis berkas tidak dikenal.' })
    expect(unggahBerkas(p('DRAF'), { ...meta('naskah-proposal'), tipe: 'image/png' }, PROPOSAL, NOW).ok).toBe(false)
    expect(unggahBerkas(p('DRAF'), meta('naskah-proposal', 'x'), PROPOSAL, NOW)).toEqual({ ok: false, galat: 'Hash SHA-256 tidak valid.' })
  })

  it('verifikasi hanya unggahan terakhir, saat menunggu pembimbing; tolak wajib alasan', () => {
    const pd = p('MENUNGGU_PEMBIMBING', { berkas: [berkas('naskah-proposal', 'DIUNGGAH', '2026-10-01T00:00:00Z'), berkas('naskah-proposal', 'DIUNGGAH', '2026-10-02T00:00:00Z')] })
    const r = verifikasiBerkas(pd, 'naskah-proposal', 'DIVERIFIKASI')
    expect(r.ok && r.p.berkas.map((b) => b.status)).toEqual(['DIUNGGAH', 'DIVERIFIKASI'])
    expect(verifikasiBerkas(pd, 'naskah-proposal', 'DITOLAK')).toEqual({ ok: false, galat: 'Alasan penolakan berkas wajib diisi.' })
    expect(verifikasiBerkas(p('DRAF', { berkas: pd.berkas }), 'naskah-proposal', 'DIVERIFIKASI').ok).toBe(false)
    expect(verifikasiBerkas(pd, 'lembar-persetujuan', 'DIVERIFIKASI')).toEqual({ ok: false, galat: 'Berkas belum diunggah.' })
  })

  it('siap kirim: abaikan persetujuan & verifikasi, tapi berkas wajib harus diunggah dan tidak ditolak', () => {
    const h = (sah: number, lunas: boolean, pd: PendaftaranUjianAkhir) => siapKirim(evaluasiKelayakan(profilUjianAkhir({ ...profilKelayakan, keuanganLunas: lunas }, sah, pd), PROPOSAL), PROPOSAL, pd)
    const diunggah = p('DRAF', { berkas: [berkas('naskah-proposal', 'DIUNGGAH'), berkas('lembar-persetujuan', 'DIUNGGAH')] })
    expect(h(4, true, diunggah)).toEqual({ ok: true, kurang: [] })
    expect(h(3, true, diunggah).kurang).toEqual(['Bimbingan disetujui: 3 dari 4 bimbingan disetujui'])
    expect(h(4, false, diunggah).ok).toBe(false)
    expect(h(4, true, p('DRAF', { berkas: [berkas('naskah-proposal', 'DIUNGGAH')] })).kurang).toEqual(['Lembar persetujuan pembimbing belum diunggah'])
    expect(h(4, true, p('DRAF', { berkas: [berkas('naskah-proposal', 'DITOLAK'), berkas('lembar-persetujuan', 'DIUNGGAH')] })).kurang).toEqual(['Naskah proposal ditolak, unggah ulang'])
  })
})

describe('sinkron alur TA', () => {
  it('persetujuan → layak, slot → dijadwalkan; tahap lain tidak berubah', () => {
    expect(peristiwaAlurUntuk('SETUJUI_PEMBIMBING', 'PROPOSAL', 'BIMBINGAN')).toEqual({ peristiwa: 'NYATAKAN_LAYAK_PROPOSAL', pelaku: 'DOSEN' })
    expect(peristiwaAlurUntuk('SETUJUI_PEMBIMBING', 'SIDANG', 'PENELITIAN')).toEqual({ peristiwa: 'NYATAKAN_LAYAK_AKHIR', pelaku: 'DOSEN' })
    expect(peristiwaAlurUntuk('PILIH_SLOT', 'PROPOSAL', 'LAYAK_PROPOSAL')).toEqual({ peristiwa: 'JADWALKAN_PROPOSAL', pelaku: 'PRODI' })
    expect(peristiwaAlurUntuk('PILIH_SLOT', 'UAPS', 'LAYAK_UJIAN_AKHIR')).toEqual({ peristiwa: 'JADWALKAN_AKHIR', pelaku: 'PRODI' })
    expect(peristiwaAlurUntuk('SETUJUI_PEMBIMBING', 'PROPOSAL', 'LAYAK_PROPOSAL')).toBeNull()
    expect(peristiwaAlurUntuk('BATALKAN', 'PROPOSAL', 'BIMBINGAN')).toBeNull()
  })
})
