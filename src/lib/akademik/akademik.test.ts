import { describe, expect, it } from 'vitest'
import { ATURAN_UMUM, DAFTAR_ATURAN } from '../../data/aturan-akademik'
import { aturanContoh, aturanUntukProdi, jenisAkhirAktif, validasiAturan } from './aturan'
import { evaluasiKelayakan, ringkasKelayakan } from './kelayakan'
import { deteksiBentrok, deteksiBeruntun } from './bentrok'
import { indeksLangkah, peristiwaSah, transisi, TRANSISI, URUTAN_STATUS, type KeadaanAlur, type KonteksAlur } from './alur-skripsi'
import { gabungPenguji, hitungNilaiPratinjau, lembarTerbuka, validasiSkor } from './nilai'
import { sesiKeTenggat } from './ics-ujian'
import { hitungBimbinganSah, jedaBimbingan, tambahVersi } from './bimbingan'
import { dosenTersedia, sisaKuota, validasiKomposisiPenguji, type Dosen } from './penguji'
import { bolehBuatPengesahan, revisiTerlambat, ringkasChecklist } from './kelulusan'
import { judulMirip, kemiripan } from './kemiripan'
import type { AturanAkademik, Bimbingan, JenisPeristiwa, ProfilAkademik, Revisi, SesiUjian, StatusTA } from './types'

const A = ATURAN_UMUM
const salin = (): AturanAkademik => structuredClone(A)

const profil = (o: Partial<ProfilAkademik> = {}): ProfilAkademik => ({
  nim: '231011400001',
  prodi: 'Teknik Informatika',
  sks: 120,
  ipk: 3.5,
  mkLulus: ['TIF401'],
  kehadiran: { TIF301: 90 },
  tagihanLunas: true,
  bimbinganDisetujui: 8,
  persetujuanPembimbing: true,
  berkasTerverifikasi: ['naskah', 'lembar-persetujuan', 'kartu-bimbingan', 'bebas-plagiasi'],
  ...o,
})

const sesi = (id: string, mulai: string, selesai: string, peserta = ['M1']): SesiUjian => ({
  id,
  jenis: 'UTS',
  judul: id,
  mulai: `2026-11-16T${mulai}:00+07:00`,
  selesai: `2026-11-16T${selesai}:00+07:00`,
  ruang: 'A-402',
  peserta,
})

describe('aturan: validasi konfigurasi', () => {
  it('konfigurasi contoh valid dan ditandai sebagai contoh', () => {
    expect(validasiAturan(A).ok).toBe(true)
    expect(aturanContoh(A)).toBe(true)
  })

  it('menolak total bobot rubrik ≠ 100 dengan pesan jelas', () => {
    const a = salin()
    a.penilaian.rubrik[0].bobot = 40
    const v = validasiAturan(a)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.galat.join()).toMatch(/total bobot harus 100, sekarang 110/)
  })

  it('menolak konfigurasi tak lengkap (jenis ujian akhir hilang, huruf mutu tanpa 0, min ≥ max)', () => {
    const a = salin()
    delete (a.ujianAkhir as Partial<AturanAkademik['ujianAkhir']>).UAPS
    a.penilaian.hurufMutu = [{ min: 50, huruf: 'A' }]
    a.penilaian.rubrik[1] = { ...a.penilaian.rubrik[1], min: 100, max: 0 }
    const v = validasiAturan(a)
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.galat.some((g) => g.includes('ujianAkhir.UAPS'))).toBe(true)
      expect(v.galat.some((g) => g.includes('hurufMutu'))).toBe(true)
      expect(v.galat.some((g) => g.includes('min (100) harus < max (0)'))).toBe(true)
    }
  })

  it('memilih aturan prodi, jatuh ke umum, dan melempar bila tidak ada', () => {
    const khusus = { ...salin(), id: 'ti', prodi: 'Teknik Informatika' }
    expect(aturanUntukProdi([A, khusus], 'Teknik Informatika').id).toBe('ti')
    expect(aturanUntukProdi(DAFTAR_ATURAN, 'Akuntansi').id).toBe(A.id)
    expect(() => aturanUntukProdi([khusus], 'Akuntansi')).toThrow(/Tidak ada aturan/)
  })

  it('jenis ujian akhir nonaktif tidak ikut di alur', () => {
    const a = salin()
    a.ujianAkhir.UAPS.aktif = false
    expect(jenisAkhirAktif(a)).toEqual(['PROPOSAL', 'SEMINAR_HASIL', 'SIDANG'])
  })
})

describe('kelayakan', () => {
  it('ujian semester: semua kombinasi kehadiran × keuangan', () => {
    for (const hadir of [90, 75, 68]) {
      for (const lunas of [true, false]) {
        const h = evaluasiKelayakan(profil({ kehadiran: { TIF301: hadir }, tagihanLunas: lunas }), { jenis: 'UAS', kodeMk: 'TIF301' }, A)
        expect(h.layak).toBe(hadir >= 75 && lunas)
        expect(h.syarat.find((s) => s.id === 'kehadiran')!.terpenuhi).toBe(hadir >= 75)
        expect(h.syarat.find((s) => s.id === 'keuangan')!.terpenuhi).toBe(lunas)
      }
    }
  })

  it('alasan bisa ditindaklanjuti dan punya tautan perbaikan', () => {
    const h = evaluasiKelayakan(profil({ kehadiran: { TIF301: 68 }, tagihanLunas: false }), { jenis: 'UTS', kodeMk: 'TIF301' }, A)
    expect(h.syarat.find((s) => s.id === 'kehadiran')).toMatchObject({ alasan: 'Kehadiran 68%, minimal 75%', tautanPerbaikan: 'presensi' })
    expect(h.syarat.find((s) => s.id === 'keuangan')!.tautanPerbaikan).toBe('keuangan')
    expect(ringkasKelayakan(h)).toBe('0 dari 2 syarat terpenuhi')
  })

  it('kehadiran tanpa data = belum layak (tidak diasumsikan memenuhi)', () => {
    const h = evaluasiKelayakan(profil({ kehadiran: {} }), { jenis: 'UTS', kodeMk: 'TIF999' }, A)
    expect(h.layak).toBe(false)
  })

  it('wajibLunas=false menghapus syarat keuangan', () => {
    const a = salin()
    a.ujianSemester.wajibLunas = false
    const h = evaluasiKelayakan(profil({ tagihanLunas: false }), { jenis: 'UTS', kodeMk: 'TIF301' }, a)
    expect(h.layak).toBe(true)
    expect(h.syarat.some((s) => s.id === 'keuangan')).toBe(false)
  })

  it('mulai TA: SKS, IPK, dan MK wajib (semua kombinasi)', () => {
    for (const sks of [100, 110]) {
      for (const ipk of [1.9, 2.0]) {
        for (const mk of [[], ['TIF401']]) {
          const h = evaluasiKelayakan(profil({ sks, ipk, mkLulus: mk }), { jenis: 'MULAI_TA' }, A)
          expect(h.layak).toBe(sks >= 110 && ipk >= 2 && mk.length === 1)
        }
      }
    }
    expect(evaluasiKelayakan(profil({ ipk: 1.9 }), { jenis: 'MULAI_TA' }, A).syarat.find((s) => s.id === 'ipk')!.alasan).toBe('IPK 1,90, minimal 2,00')
  })

  it('ujian akhir: bimbingan, persetujuan, keuangan, berkas wajib', () => {
    expect(evaluasiKelayakan(profil(), { jenis: 'SIDANG' }, A).layak).toBe(true)
    const kurang = evaluasiKelayakan(profil({ bimbinganDisetujui: 3, persetujuanPembimbing: false, berkasTerverifikasi: ['naskah'] }), { jenis: 'SIDANG' }, A)
    expect(kurang.layak).toBe(false)
    expect(kurang.syarat.find((s) => s.id === 'bimbingan')!.alasan).toBe('3 dari 8 bimbingan disetujui')
    expect(kurang.syarat.filter((s) => s.id.startsWith('berkas-') && !s.terpenuhi).map((s) => s.id)).toEqual(['berkas-lembar-persetujuan', 'berkas-kartu-bimbingan', 'berkas-bebas-plagiasi'])
  })

  it('ujian akhir nonaktif tidak pernah layak', () => {
    const a = salin()
    a.ujianAkhir.UAPS.aktif = false
    expect(evaluasiKelayakan(profil(), { jenis: 'UAPS' }, a).layak).toBe(false)
  })
})

describe('bentrok & beruntun', () => {
  it('batas bersinggungan tepat BUKAN bentrok', () => {
    expect(deteksiBentrok([sesi('a', '08:00', '10:00'), sesi('b', '10:00', '12:00')])).toHaveLength(0)
  })
  it('beririsan satu menit = bentrok, dengan orang yang terkena', () => {
    const r = deteksiBentrok([sesi('a', '08:00', '10:01'), sesi('b', '10:00', '12:00')])
    expect(r).toHaveLength(1)
    expect(r[0].orang).toEqual(['M1'])
  })
  it('jam sama di hari berbeda bukan bentrok', () => {
    const b = { ...sesi('b', '08:00', '10:00'), mulai: '2026-11-17T08:00:00+07:00', selesai: '2026-11-17T10:00:00+07:00' }
    expect(deteksiBentrok([sesi('a', '08:00', '10:00'), b])).toHaveLength(0)
  })
  it('bentrok per orang: dosen vs mahasiswa', () => {
    const list = [sesi('a', '08:00', '10:00', ['M1', 'D1']), sesi('b', '09:00', '11:00', ['M2', 'D1'])]
    expect(deteksiBentrok(list, 'M1')).toHaveLength(0)
    expect(deteksiBentrok(list, 'D1')).toHaveLength(1)
    expect(deteksiBentrok(list)[0].orang).toEqual(['D1'])
  })
  it('sesi panjang bentrok dengan beberapa sesi', () => {
    expect(deteksiBentrok([sesi('a', '08:00', '14:00'), sesi('b', '09:00', '10:00'), sesi('c', '12:00', '13:00')])).toHaveLength(2)
  })
  it('ujian beruntun di bawah ambang', () => {
    const r = deteksiBeruntun([sesi('a', '08:00', '10:00'), sesi('b', '10:15', '12:00'), sesi('c', '13:00', '14:00')], 'M1', 30)
    expect(r.map((x) => [x.a.id, x.b.id, x.jedaMenit])).toEqual([['a', 'b', 15]])
  })
})

describe('alur skripsi (mesin status)', () => {
  const ctx: KonteksAlur = { judul: 'Sistem rekomendasi', pilihanPembimbing: ['D1'], pembimbing: ['D1'] }
  const p = (jenis: JenisPeristiwa, extra = {}) => ({ jenis, oleh: 'uji', pada: '2026-10-28T10:00:00+07:00', ...extra })
  const k = (status: StatusTA): KeadaanAlur => ({ status, riwayat: [] })
  const SEMUA_STATUS: StatusTA[] = [...URUTAN_STATUS, 'DITOLAK']
  const SEMUA_PERISTIWA: JenisPeristiwa[] = ['AJUKAN', 'SETUJUI_PEMBIMBING', 'TOLAK', 'AJUKAN_ULANG', 'MULAI_BIMBINGAN', 'NYATAKAN_LAYAK_PROPOSAL', 'JADWALKAN_UJIAN', 'LULUS', 'LULUS_DENGAN_REVISI', 'TIDAK_LULUS', 'REVISI_DISETUJUI', 'NYATAKAN_LAYAK_AKHIR', 'SELESAIKAN']

  it('setiap pasangan (status, peristiwa) sah hanya bila ada di tabel', () => {
    for (const s of SEMUA_STATUS) {
      for (const e of SEMUA_PERISTIWA) {
        const r = transisi(k(s), p(e, { alasan: 'alasan uji' }), ctx)
        const target = TRANSISI[s]?.[e]
        expect(r.ok, `${s} --${e}-->`).toBe(!!target)
        if (r.ok) expect(r.keadaan.status).toBe(target)
      }
    }
  })

  it('jalur bahagia sampai SELESAI mencatat riwayat lengkap', () => {
    const jalur: JenisPeristiwa[] = ['AJUKAN', 'SETUJUI_PEMBIMBING', 'MULAI_BIMBINGAN', 'NYATAKAN_LAYAK_PROPOSAL', 'JADWALKAN_UJIAN', 'LULUS_DENGAN_REVISI', 'REVISI_DISETUJUI', 'NYATAKAN_LAYAK_AKHIR', 'JADWALKAN_UJIAN', 'LULUS', 'SELESAIKAN']
    let st = k('DRAF_JUDUL')
    for (const e of jalur) {
      const r = transisi(st, p(e), ctx)
      expect(r.ok, e).toBe(true)
      if (r.ok) st = r.keadaan
    }
    expect(st.status).toBe('SELESAI')
    expect(st.riwayat).toHaveLength(jalur.length)
  })

  it('penolakan wajib alasan, dan riwayat penolakan tidak hilang setelah ajukan ulang', () => {
    expect(transisi(k('DIAJUKAN'), p('TOLAK'), ctx).ok).toBe(false)
    const tolak = transisi(k('DIAJUKAN'), p('TOLAK', { alasan: 'Judul terlalu luas' }), ctx)
    expect(tolak.ok).toBe(true)
    if (!tolak.ok) return
    const ulang = transisi(tolak.keadaan, p('AJUKAN_ULANG'), ctx)
    expect(ulang.ok && ulang.keadaan.status).toBe('DRAF_JUDUL')
    if (ulang.ok) expect(ulang.keadaan.riwayat.map((r) => r.peristiwa.alasan)).toContain('Judul terlalu luas')
  })

  it('penjaga: tanpa judul/pilihan pembimbing tidak bisa diajukan; tanpa pembimbing tidak bisa bimbingan', () => {
    expect(transisi(k('DRAF_JUDUL'), p('AJUKAN'), { ...ctx, judul: ' ' }).ok).toBe(false)
    expect(transisi(k('DRAF_JUDUL'), p('AJUKAN'), { ...ctx, pilihanPembimbing: [] }).ok).toBe(false)
    expect(transisi(k('DISETUJUI_PEMBIMBING'), p('MULAI_BIMBINGAN'), { ...ctx, pembimbing: [] }).ok).toBe(false)
  })

  it('tidak lulus kembali ke tahap sebelumnya, wajib alasan', () => {
    const r = transisi(k('UJIAN_AKHIR'), p('TIDAK_LULUS', { alasan: 'Analisis belum memadai' }), ctx)
    expect(r.ok && r.keadaan.status).toBe('PENELITIAN')
  })

  it('peristiwa sah & indeks langkah untuk stepper', () => {
    expect(peristiwaSah('DIAJUKAN').sort()).toEqual(['SETUJUI_PEMBIMBING', 'TOLAK'])
    expect(peristiwaSah('SELESAI')).toEqual([])
    expect(indeksLangkah('DITOLAK')).toBe(indeksLangkah('DIAJUKAN'))
  })
})

describe('nilai pratinjau', () => {
  const skor = (n: number[]) => A.penilaian.rubrik.map((k, i) => ({ kriteria: k.id, nilai: n[i] }))

  it('rata-rata berbobot dengan pembulatan & huruf mutu, berlabel perkiraan', () => {
    // 80×.3 + 90×.3 + 70×.2 + 85×.2 = 24 + 27 + 14 + 17 = 82
    expect(hitungNilaiPratinjau(A, skor([80, 90, 70, 85]))).toEqual({ ok: true, nilai: 82, huruf: 'A-', label: 'perkiraan' })
  })

  it('pembulatan mengikuti desimal konfigurasi', () => {
    const a = salin()
    a.penilaian.desimal = 1
    const r = hitungNilaiPratinjau(a, skor([83.33, 83.33, 83.33, 83.34]))
    expect(r.ok && r.nilai).toBe(83.3)
  })

  it('skor di luar rentang / belum diisi / kriteria asing ditolak', () => {
    expect(validasiSkor(A.penilaian.rubrik, skor([101, 90, 70, 85]))[0]).toMatch(/di luar rentang 0–100/)
    expect(hitungNilaiPratinjau(A, skor([80, 90, 70, Number.NaN])).ok).toBe(false)
    expect(validasiSkor(A.penilaian.rubrik, [...skor([1, 1, 1, 1]), { kriteria: 'x', nilai: 1 }])).toContain('Kriteria tak dikenal: x')
  })

  it('bobot tidak 100% tetap proporsional (dinormalisasi)', () => {
    const a = salin()
    a.penilaian.rubrik = a.penilaian.rubrik.map((k) => ({ ...k, bobot: k.bobot / 2 })) // total 50
    expect(hitungNilaiPratinjau(a, skor([80, 90, 70, 85]))).toMatchObject({ ok: true, nilai: 82 })
  })

  it('gabungan penguji & penanda rapat kesepakatan', () => {
    expect(gabungPenguji([80, 90], A)).toMatchObject({ rata: 85, huruf: 'A', selisihMaks: 10, perluRapat: false })
    expect(gabungPenguji([70, 90], A)!.perluRapat).toBe(true)
    expect(gabungPenguji([], A)).toBeNull()
  })

  it('lembar penilaian hanya terbuka di jendela waktu', () => {
    const s = { mulai: '2026-11-20T09:00:00+07:00', selesai: '2026-11-20T10:30:00+07:00' }
    const j = A.ujianAkhir.SIDANG.jendelaPenilaian
    expect(lembarTerbuka(s, j, new Date('2026-11-20T08:40:00+07:00'))).toBe(false)
    expect(lembarTerbuka(s, j, new Date('2026-11-20T08:45:00+07:00'))).toBe(true)
    expect(lembarTerbuka(s, j, new Date('2026-11-20T13:30:00+07:00'))).toBe(true)
    expect(lembarTerbuka(s, j, new Date('2026-11-20T13:31:00+07:00'))).toBe(false)
  })
})

describe('bimbingan, penguji, kelulusan, kemiripan', () => {
  const b = (tanggal: string, status: Bimbingan['status']): Bimbingan => ({ id: tanggal, tanggal, bab: 'I', ringkasan: '', tugasBerikutnya: '', status })

  it('hanya entri disetujui yang dihitung', () => {
    expect(hitungBimbinganSah([b('2026-09-01', 'DISETUJUI'), b('2026-09-08', 'MENUNGGU'), b('2026-09-15', 'DITOLAK')])).toBe(1)
  })

  it('pengingat jeda bimbingan', () => {
    const now = new Date('2026-10-28T10:00:00+07:00')
    expect(jedaBimbingan([b('2026-10-20T10:00:00+07:00', 'DISETUJUI')], now, 14)).toBeNull()
    expect(jedaBimbingan([b('2026-10-01T10:00:00+07:00', 'DISETUJUI')], now, 14)).toBe(27)
    expect(jedaBimbingan([], now, 14)).toBeNull()
  })

  it('versi draf tidak menimpa dan menolak hash identik', () => {
    const v1 = tambahVersi([], { nama: 'bab1.pdf', ukuran: 10, sha256: 'aa', diunggah: 'x', catatan: '' })
    expect(v1.ok && v1.daftar[0].versi).toBe(1)
    if (!v1.ok) return
    expect(tambahVersi(v1.daftar, { nama: 'bab1.pdf', ukuran: 10, sha256: 'aa', diunggah: 'y', catatan: '' }).ok).toBe(false)
    const v2 = tambahVersi(v1.daftar, { nama: 'bab1-rev.pdf', ukuran: 12, sha256: 'bb', diunggah: 'y', catatan: 'revisi' })
    expect(v2.ok && v2.daftar.map((v) => v.versi)).toEqual([1, 2])
  })

  it('kuota pembimbing dan komposisi penguji', () => {
    const d = (nidn: string, beban: number, kuota: number | null = null, buka = true): Dosen => ({ nidn, nama: nidn, email: '', bidang: [], beban, kuota, kuotaDibuka: buka })
    expect(sisaKuota(d('x', 7), 10)).toBe(3)
    expect(dosenTersedia([d('a', 10), d('b', 2), d('c', 2, 2), d('e', 0, null, false)], 10).map((x) => x.nidn)).toEqual(['b'])
    const sidang = A.ujianAkhir.SIDANG
    expect(validasiKomposisiPenguji(['P1', 'P2', 'P3'], ['D1'], sidang)).toEqual([])
    expect(validasiKomposisiPenguji(['P1', 'D1', 'P3'], ['D1'], sidang)[0]).toMatch(/Pembimbing tidak boleh/)
    expect(validasiKomposisiPenguji(['P1', 'P1'], ['D1'], sidang).length).toBe(2)
  })

  it('lembar pengesahan & checklist kelulusan', () => {
    const r = (status: Revisi['status']): Revisi => ({ id: status, bagian: 'Bab 4', permintaan: '', penguji: 'P1', tenggat: '2026-11-01T00:00:00+07:00', status })
    expect(bolehBuatPengesahan([r('DISETUJUI'), r('DIAJUKAN')]).boleh).toBe(false)
    expect(bolehBuatPengesahan([r('DISETUJUI')]).boleh).toBe(true)
    expect(revisiTerlambat(r('DIAJUKAN'), new Date('2026-11-02'))).toBe(true)
    expect(revisiTerlambat(r('DISETUJUI'), new Date('2026-11-02'))).toBe(false)
    expect(ringkasChecklist([{ id: 'a', nama: '', rute: '', status: 'SELESAI' }, { id: 'b', nama: '', rute: '', status: 'DIPROSES' }]).lengkap).toBe(false)
    expect(ringkasChecklist([]).lengkap).toBe(false)
  })

  it('kemiripan judul (peringatan, bukan penolakan)', () => {
    expect(kemiripan('Sistem Rekomendasi Film', 'sistem rekomendasi film!')).toBe(1)
    const mirip = judulMirip('Sistem Rekomendasi Buku Perpustakaan', ['Sistem Rekomendasi Buku Digital', 'Analisis Sentimen Twitter'], 0.5)
    expect(mirip.map((m) => m.judul)).toEqual(['Sistem Rekomendasi Buku Digital'])
  })

  it('sesi ujian menjadi tenggat dengan alarm H-1 dan 2 jam', () => {
    const t = sesiKeTenggat({ ...sesi('x', '08:00', '10:00'), kursi: 'A-17' })
    expect(t).toMatchObject({ id: 'ujian-x', sumber: 'ujian', alarmMenit: [1440, 120], lokasi: 'A-402, kursi A-17' })
  })
})
