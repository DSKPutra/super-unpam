import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN, ATURAN_PRODI, type AturanProdi, type AturanUjian, type Rubrik } from '../../data/aturan-akademik'
import { TABEL_ALUR, peristiwaTersedia, transisi, type Peristiwa } from './alur-skripsi'
import { aturanUjian, aturanUntuk, AturanTidakValid, validasiAturan } from './aturan'
import { deteksiBentrok, deteksiBeruntun, sesiPetugas } from './bentrok'
import { buatIcs, escIcs, sesiKeTenggat } from './ics-ujian'
import { evaluasiKelayakan, ringkasKelayakan } from './kelayakan'
import { hitungNilaiPratinjau, hurufDari, nilaiPenguji } from './nilai'
import type { PeranAlur, ProfilKelayakan, SesiUjian, StatusTugasAkhir, TugasAkhir } from './types'

/* ---------------- Konfigurasi ---------------- */

describe('validasi konfigurasi aturan', () => {
  it('konfigurasi yang dikirim valid dan semua nilai masih contoh (TODO BAAK)', () => {
    expect(validasiAturan(ATURAN_PRODI)).toEqual([])
    for (const a of ATURAN_PRODI) {
      expect(a.sumber).toBeNull()
      for (const u of a.ujian) expect(u.sumber).toBeNull()
    }
  })

  it('menolak konfigurasi tak lengkap dengan pesan yang menyebut lokasinya', () => {
    const rusak: AturanProdi = {
      ...ATURAN_BAWAAN,
      desimal: 9,
      hurufMutu: [{ min: 50, huruf: 'C' }],
      ujian: [...ATURAN_BAWAAN.ujian, { ...ATURAN_BAWAAN.ujian[0], syarat: [{ id: 'kehadiran', minPersen: 120 }, { id: 'ipk', minimal: 5 }, { id: 'berkas', wajib: [] }] }],
      rubrik: [{ ...ATURAN_BAWAAN.rubrik[0], kriteria: [{ id: 'x', label: 'X', bobot: 60, min: 10, maks: 10 }] }],
    }
    const m = validasiAturan([rusak, { ...ATURAN_BAWAAN }]).join('\n')
    expect(m).toMatch(/Prodi "\*" didefinisikan lebih dari sekali/)
    expect(m).toMatch(/desimal harus bilangan bulat 0–4/)
    expect(m).toMatch(/hurufMutu harus punya batas min 0/)
    expect(m).toMatch(/ujian UTS didefinisikan lebih dari sekali/)
    expect(m).toMatch(/minPersen kehadiran harus 0–100/)
    expect(m).toMatch(/minimal IPK harus 0–4/)
    expect(m).toMatch(/syarat berkas tanpa daftar berkas/)
    expect(m).toMatch(/jumlah bobot 60%, harus 100%/)
    expect(m).toMatch(/maks harus lebih besar dari min/)
    expect(validasiAturan([{ ...ATURAN_BAWAAN, prodi: 'TI' }])).toEqual(["Tidak ada aturan bawaan (prodi '*')."])
    expect(() => aturanUntuk('TI', [{ ...ATURAN_BAWAAN, prodi: 'TI' }])).toThrow(AturanTidakValid)
  })

  it('aturan prodi menimpa bawaan per field dan per jenis ujian', () => {
    const khusus: AturanProdi = { ...ATURAN_BAWAAN, prodi: 'Teknik Informatika', kuotaBimbingan: 8, ujian: [{ ...aturanUjian(ATURAN_BAWAAN, 'UTS'), jedaMinimalMenit: 45 }], rubrik: [] }
    const a = aturanUntuk('Teknik Informatika', [ATURAN_BAWAAN, khusus])
    expect(a.kuotaBimbingan).toBe(8)
    expect(aturanUjian(a, 'UTS').jedaMinimalMenit).toBe(45)
    expect(aturanUjian(a, 'UAS')).toBe(aturanUjian(ATURAN_BAWAAN, 'UAS'))
    expect(a.rubrik).toEqual(ATURAN_BAWAAN.rubrik)
    expect(aturanUntuk('Prodi Lain', [ATURAN_BAWAAN, khusus])).toBe(ATURAN_BAWAAN)
    expect(() => aturanUjian({ ...ATURAN_BAWAAN, ujian: [] }, 'UAS')).toThrow(/Tidak ada aturan untuk ujian UAS/)
  })
})

/* ---------------- Kelayakan ---------------- */

const LAYAK: ProfilKelayakan = {
  prodi: 'Teknik Informatika',
  kehadiran: { TIF301: 90 },
  keuanganLunas: true,
  sks: 140,
  ipk: 3.4,
  bimbinganDisetujui: 8,
  persetujuanPembimbing: true,
  berkas: ['naskah-final', 'bebas-pustaka'],
  mkLulus: ['TIF499'],
}

const ATURAN_LENGKAP: AturanUjian = {
  jenis: 'SIDANG',
  nama: 'Uji',
  sumber: 'Dokumen uji hlm. 1',
  dicek: '2026-10-28',
  jedaMinimalMenit: 0,
  tataTertib: [],
  syarat: [
    { id: 'kehadiran', minPersen: 75 },
    { id: 'keuangan' },
    { id: 'sks', minimal: 138 },
    { id: 'ipk', minimal: 2 },
    { id: 'bimbingan', minimal: 8 },
    { id: 'persetujuan-pembimbing' },
    { id: 'berkas', wajib: [{ id: 'naskah-final', label: 'Naskah' }, { id: 'bebas-pustaka', label: 'Bebas pustaka' }] },
    { id: 'mk-wajib', kode: [{ kode: 'TIF499', nama: 'Metodologi Penelitian' }] },
  ],
}

describe('evaluasiKelayakan', () => {
  it('semua syarat terpenuhi → layak, label contoh mengikuti sumber aturan', () => {
    const h = evaluasiKelayakan(LAYAK, ATURAN_LENGKAP, 'TIF301')
    expect(h.layak).toBe(true)
    expect(h.syarat.map((s) => s.id)).toEqual(['kehadiran', 'keuangan', 'sks', 'ipk', 'bimbingan', 'persetujuan-pembimbing', 'berkas', 'mk-wajib'])
    expect(h.syarat.every((s) => !s.contoh)).toBe(true)
    expect(evaluasiKelayakan(LAYAK, { ...ATURAN_LENGKAP, sumber: null }, 'TIF301').syarat.find((s) => s.id === 'sks')!.contoh).toBe(true)
    expect(ringkasKelayakan(h)).toBe('Memenuhi semua 8 syarat')
  })

  // Setiap syarat gagal sendiri-sendiri → hanya syarat itu yang gagal, dengan alasan dan tautan perbaikan.
  const kasus: [string, Partial<ProfilKelayakan>, RegExp, string][] = [
    ['kehadiran', { kehadiran: { TIF301: 68 } }, /^Kehadiran 68%, minimal 75%$/, 'presensi'],
    ['keuangan', { keuanganLunas: false }, /tagihan/, 'keuangan'],
    ['sks', { sks: 120 }, /^120 SKS, minimal 138 SKS$/, 'akademik/nilai'],
    ['ipk', { ipk: 1.95 }, /^IPK 1\.95, minimal 2\.00$/, 'akademik/nilai'],
    ['bimbingan', { bimbinganDisetujui: 3 }, /^3 dari 8 bimbingan disetujui$/, 'ta'],
    ['persetujuan-pembimbing', { persetujuanPembimbing: false }, /Belum disetujui/, 'ta'],
    ['berkas', { berkas: ['naskah-final'] }, /^Belum lengkap: Bebas pustaka$/, 'ta'],
    ['mk-wajib', { mkLulus: [] }, /^Belum lulus: Metodologi Penelitian$/, 'akademik/krs'],
  ]
  it.each(kasus)('gagal hanya pada %s', (id, ubah, alasan, tautan) => {
    const h = evaluasiKelayakan({ ...LAYAK, ...ubah }, ATURAN_LENGKAP, 'TIF301')
    expect(h.layak).toBe(false)
    const gagal = h.syarat.filter((s) => !s.terpenuhi)
    expect(gagal.map((s) => s.id)).toEqual([id])
    expect(gagal[0].alasan).toMatch(alasan)
    expect(gagal[0].tautanPerbaikan).toBe(tautan)
  })

  it('semua kombinasi gagal: layak hanya bila tidak ada yang gagal', () => {
    for (let mask = 0; mask < 1 << kasus.length; mask++) {
      const profil = kasus.reduce<ProfilKelayakan>((p, [, ubah], i) => (mask & (1 << i) ? { ...p, ...ubah } : p), LAYAK)
      const h = evaluasiKelayakan(profil, ATURAN_LENGKAP, 'TIF301')
      const jumlahGagal = h.syarat.filter((s) => !s.terpenuhi).length
      expect(jumlahGagal).toBe(kasus.filter((_, i) => mask & (1 << i)).length)
      expect(h.layak).toBe(mask === 0)
    }
  })

  it('batas tepat ambang lolos; data kehadiran tidak ada dianggap belum memenuhi', () => {
    expect(evaluasiKelayakan({ ...LAYAK, kehadiran: { TIF301: 75 }, sks: 138, ipk: 2, bimbinganDisetujui: 8 }, ATURAN_LENGKAP, 'TIF301').layak).toBe(true)
    const h = evaluasiKelayakan(LAYAK, ATURAN_LENGKAP, 'MK-LAIN')
    expect(h.syarat[0]).toMatchObject({ terpenuhi: false, alasan: 'Data kehadiran belum tersedia.' })
    expect(ringkasKelayakan(h)).toBe('Belum memenuhi 1 dari 8 syarat: Kehadiran')
  })
})

/* ---------------- Bentrok ---------------- */

const sesi = (id: string, mulai: string, selesai: string, petugas: string[] = []): SesiUjian => ({ id, jenis: 'UTS', kode: id, nama: id, mulai: `${mulai}+07:00`, selesai: `${selesai}+07:00`, ruang: 'R1', petugas })

describe('deteksiBentrok & deteksiBeruntun', () => {
  it('bersinggungan tepat di batas jam tidak bentrok', () => {
    expect(deteksiBentrok([sesi('a', '2026-11-16T08:00', '2026-11-16T10:00'), sesi('b', '2026-11-16T10:00', '2026-11-16T12:00')])).toEqual([])
  })
  it('tumpang tindih satu menit bentrok; urutan masukan tidak berpengaruh', () => {
    const a = sesi('a', '2026-11-16T08:00', '2026-11-16T10:01')
    const b = sesi('b', '2026-11-16T10:00', '2026-11-16T12:00')
    expect(deteksiBentrok([b, a]).map((x) => [x.a.id, x.b.id])).toEqual([['a', 'b']])
  })
  it('satu sesi panjang bentrok dengan beberapa sesi; beda hari tidak bentrok', () => {
    const out = deteksiBentrok([sesi('panjang', '2026-11-16T08:00', '2026-11-16T15:00'), sesi('x', '2026-11-16T09:00', '2026-11-16T10:00'), sesi('y', '2026-11-16T13:00', '2026-11-16T14:00'), sesi('besok', '2026-11-17T09:00', '2026-11-17T10:00')])
    expect(out.map((x) => `${x.a.id}-${x.b.id}`)).toEqual(['panjang-x', 'panjang-y'])
  })
  it('sesi tidak valid ditolak', () => {
    expect(() => deteksiBentrok([sesi('z', '2026-11-16T10:00', '2026-11-16T10:00')])).toThrow(/selesai harus setelah mulai/)
  })
  it('beruntun: jeda di bawah ambang terdeteksi, tepat ambang tidak', () => {
    const s = [sesi('a', '2026-11-16T08:00', '2026-11-16T09:40'), sesi('b', '2026-11-16T10:00', '2026-11-16T11:40'), sesi('c', '2026-11-16T12:10', '2026-11-16T13:00')]
    expect(deteksiBeruntun(s, 30).map((x) => [x.sebelum.id, x.sesudah.id, x.jedaMenit])).toEqual([['a', 'b', 20]])
    expect(deteksiBeruntun(s, 20)).toEqual([])
  })
  it('sisi dosen: hanya sesi yang ia awasi', () => {
    const s = [sesi('a', '2026-11-16T08:00', '2026-11-16T10:00', ['D1']), sesi('b', '2026-11-16T09:00', '2026-11-16T11:00', ['D2']), sesi('c', '2026-11-16T09:30', '2026-11-16T10:30', ['D1', 'D2'])]
    expect(deteksiBentrok(sesiPetugas(s, 'D1')).map((x) => `${x.a.id}-${x.b.id}`)).toEqual(['a-c'])
    expect(deteksiBentrok(sesiPetugas(s, 'D2')).map((x) => `${x.a.id}-${x.b.id}`)).toEqual(['b-c'])
  })
})

/* ---------------- Alur skripsi ---------------- */

const ta = (status: StatusTugasAkhir, extra: Partial<TugasAkhir> = {}): TugasAkhir => ({ id: 'ta1', judul: 'Judul', abstrak: '', bidang: 'RPL', metode: '', pilihanPembimbing: ['D1'], pembimbing: ['D1'], status, riwayat: [], perubahan: [], ...extra })
const WAKTU = '2026-10-28T03:00:00.000Z'
const konteksSah = (pelaku: PeranAlur) => ({ pelaku, layak: true, pembimbing: ['D1'], catatan: 'Alasan', waktu: WAKTU })

describe('mesin alur tugas akhir', () => {
  const STATUS: StatusTugasAkhir[] = [...new Set(TABEL_ALUR.flatMap((a) => [a.dari, a.ke]))]
  const PERISTIWA = [...new Set(TABEL_ALUR.map((a) => a.peristiwa))] as Peristiwa[]
  const PERAN: PeranAlur[] = ['MAHASISWA', 'DOSEN', 'PRODI']

  it.each(TABEL_ALUR.map((a) => [a.dari, a.peristiwa, a.ke, a.pelaku[0]] as const))('sah: %s --%s--> %s', (dari, p, ke, pelaku) => {
    const r = transisi(ta(dari), p, konteksSah(pelaku))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.ta.status).toBe(ke)
      expect(r.ta.riwayat).toEqual([{ dari, ke, peristiwa: p, pelaku, waktu: WAKTU, catatan: 'Alasan' }])
    }
  })

  it('setiap kombinasi (status, peristiwa) di luar tabel ditolak tanpa mengubah data', () => {
    let ditolak = 0
    for (const s of STATUS)
      for (const p of PERISTIWA) {
        if (TABEL_ALUR.some((a) => a.dari === s && a.peristiwa === p)) continue
        const awal = ta(s)
        for (const pelaku of PERAN) {
          const r = transisi(awal, p, konteksSah(pelaku))
          expect(r).toEqual({ ok: false, galat: `Peristiwa ${p} tidak sah dari status ${s}.` })
          ditolak++
        }
        expect(awal.status).toBe(s)
      }
    expect(ditolak).toBeGreaterThan(100)
  })

  it('pelaku yang tidak berwenang ditolak', () => {
    for (const a of TABEL_ALUR)
      for (const pelaku of PERAN.filter((x) => !a.pelaku.includes(x))) expect(transisi(ta(a.dari), a.peristiwa, konteksSah(pelaku))).toEqual({ ok: false, galat: `${pelaku} tidak berwenang melakukan ${a.peristiwa}.` })
  })

  it('penjaga: judul kosong, tanpa pembimbing, belum layak, penolakan tanpa alasan', () => {
    expect(transisi(ta('DRAF_JUDUL', { judul: '  ' }), 'AJUKAN_JUDUL', { pelaku: 'MAHASISWA' })).toEqual({ ok: false, galat: 'Judul belum diisi.' })
    expect(transisi(ta('DIAJUKAN'), 'SETUJUI_JUDUL', { pelaku: 'DOSEN' })).toEqual({ ok: false, galat: 'Pembimbing belum ditetapkan.' })
    expect(transisi(ta('DISETUJUI_PEMBIMBING', { pembimbing: [] }), 'MULAI_BIMBINGAN', { pelaku: 'MAHASISWA' })).toEqual({ ok: false, galat: 'Tidak bisa bimbingan tanpa pembimbing.' })
    expect(transisi(ta('BIMBINGAN'), 'NYATAKAN_LAYAK_PROPOSAL', { pelaku: 'DOSEN', layak: false })).toEqual({ ok: false, galat: 'Syarat kelayakan belum terpenuhi.' })
    expect(transisi(ta('DIAJUKAN'), 'TOLAK_JUDUL', { pelaku: 'DOSEN', catatan: ' ' })).toEqual({ ok: false, galat: 'Alasan wajib diisi.' })
  })

  it('jalur lengkap dari draf sampai selesai, riwayat penolakan tidak hilang', () => {
    const langkah: [Peristiwa, PeranAlur][] = [
      ['AJUKAN_JUDUL', 'MAHASISWA'], ['TOLAK_JUDUL', 'DOSEN'], ['AJUKAN_ULANG', 'MAHASISWA'], ['AJUKAN_JUDUL', 'MAHASISWA'], ['SETUJUI_JUDUL', 'PRODI'],
      ['MULAI_BIMBINGAN', 'MAHASISWA'], ['NYATAKAN_LAYAK_PROPOSAL', 'DOSEN'], ['JADWALKAN_PROPOSAL', 'PRODI'], ['HASIL_REVISI', 'PRODI'], ['REVISI_DISETUJUI', 'DOSEN'],
      ['NYATAKAN_LAYAK_AKHIR', 'DOSEN'], ['JADWALKAN_AKHIR', 'PRODI'], ['HASIL_LULUS', 'PRODI'], ['SELESAIKAN', 'PRODI'],
    ]
    let cur = ta('DRAF_JUDUL', { pembimbing: [] })
    for (const [p, pelaku] of langkah) {
      const r = transisi(cur, p, konteksSah(pelaku))
      if (!r.ok) throw new Error(`${p}: ${r.galat}`)
      cur = r.ta
    }
    expect(cur.status).toBe('SELESAI')
    expect(cur.pembimbing).toEqual(['D1'])
    expect(cur.riwayat).toHaveLength(langkah.length)
    expect(cur.riwayat[1]).toMatchObject({ ke: 'DITOLAK', catatan: 'Alasan' })
  })

  it('peristiwaTersedia per peran', () => {
    expect(peristiwaTersedia('DIAJUKAN', 'DOSEN')).toEqual(['SETUJUI_JUDUL', 'TOLAK_JUDUL'])
    expect(peristiwaTersedia('DIAJUKAN', 'MAHASISWA')).toEqual([])
    expect(peristiwaTersedia('SELESAI', 'PRODI')).toEqual([])
  })
})

/* ---------------- Nilai ---------------- */

const RUBRIK: Rubrik = {
  jenis: 'SIDANG', sumber: null, dicek: null, ambangSelisih: 15,
  kriteria: [
    { id: 'n', label: 'Naskah', bobot: 30, min: 0, maks: 100 },
    { id: 'p', label: 'Presentasi', bobot: 20, min: 0, maks: 100 },
    { id: 'k', label: 'Penguasaan', bobot: 50, min: 0, maks: 100 },
  ],
}
const skor = (n: number, p: number, k: number) => [{ kriteriaId: 'n', nilai: n }, { kriteriaId: 'p', nilai: p }, { kriteriaId: 'k', nilai: k }]

describe('nilai pratinjau', () => {
  it('rata-rata berbobot, rata-rata antar penguji, huruf dari konfigurasi, berlabel perkiraan', () => {
    expect(nilaiPenguji(RUBRIK, skor(80, 90, 70))).toBeCloseTo(77)
    const h = hitungNilaiPratinjau(RUBRIK, [{ skor: skor(80, 90, 70) }, { skor: skor(90, 80, 80) }], ATURAN_BAWAAN.hurufMutu, 2)
    expect(h).toEqual({ perkiraan: true, nilai: 80, huruf: 'A-', perPenguji: [77, 83], perluKesepakatan: false })
  })

  it('pembulatan sesuai desimal konfigurasi (termasuk kasus float x.xx5)', () => {
    const r: Rubrik = { ...RUBRIK, kriteria: [{ id: 'a', label: 'A', bobot: 100, min: 0, maks: 100 }] }
    expect(hitungNilaiPratinjau(r, [{ skor: [{ kriteriaId: 'a', nilai: 80.005 }] }], ATURAN_BAWAAN.hurufMutu, 2).nilai).toBe(80.01)
    expect(hitungNilaiPratinjau(r, [{ skor: [{ kriteriaId: 'a', nilai: 80.4 }] }], ATURAN_BAWAAN.hurufMutu, 0).nilai).toBe(80)
  })

  it('skala kriteria selain 0–100 dinormalisasi', () => {
    const r: Rubrik = { ...RUBRIK, kriteria: [{ id: 'a', label: 'A', bobot: 100, min: 1, maks: 5 }] }
    expect(nilaiPenguji(r, [{ kriteriaId: 'a', nilai: 4 }])).toBe(75)
  })

  it('bobot tidak 100%, skor di luar rentang, kosong, ganda, atau asing ditolak', () => {
    expect(() => nilaiPenguji({ ...RUBRIK, kriteria: RUBRIK.kriteria.map((k) => ({ ...k, bobot: 30 })) }, skor(1, 1, 1))).toThrow(/jumlah bobot 90%/)
    expect(() => nilaiPenguji(RUBRIK, skor(101, 1, 1))).toThrow(/Naskah harus 0–100/)
    expect(() => nilaiPenguji(RUBRIK, skor(-1, 1, 1))).toThrow(/Naskah harus 0–100/)
    expect(() => nilaiPenguji(RUBRIK, skor(1, 1, 1).slice(0, 2))).toThrow(/k belum diisi/)
    expect(() => nilaiPenguji(RUBRIK, [...skor(1, 1, 1), { kriteriaId: 'n', nilai: 2 }])).toThrow(/n ganda/)
    expect(() => nilaiPenguji(RUBRIK, [...skor(1, 1, 1), { kriteriaId: 'x', nilai: 2 }])).toThrow(/x tidak ada/)
    expect(() => hitungNilaiPratinjau(RUBRIK, [], ATURAN_BAWAAN.hurufMutu, 2)).toThrow(/Belum ada penilaian/)
  })

  it('selisih antar penguji melebihi ambang → perlu kesepakatan', () => {
    expect(hitungNilaiPratinjau(RUBRIK, [{ skor: skor(90, 90, 90) }, { skor: skor(70, 70, 70) }], ATURAN_BAWAAN.hurufMutu, 2).perluKesepakatan).toBe(true)
    expect(hitungNilaiPratinjau(RUBRIK, [{ skor: skor(85, 85, 85) }, { skor: skor(70, 70, 70) }], ATURAN_BAWAAN.hurufMutu, 2).perluKesepakatan).toBe(false)
  })

  it('huruf mutu di batas', () => {
    expect(hurufDari(85, ATURAN_BAWAAN.hurufMutu)).toBe('A')
    expect(hurufDari(84.99, ATURAN_BAWAAN.hurufMutu)).toBe('A-')
    expect(hurufDari(0, ATURAN_BAWAAN.hurufMutu)).toBe('E')
    expect(() => hurufDari(-1, ATURAN_BAWAAN.hurufMutu)).toThrow()
  })
})

/* ---------------- .ics & Tenggat ---------------- */

describe('sesi ujian → Tenggat dan .ics', () => {
  const s: SesiUjian = { id: 'uts-TIF301', jenis: 'UTS', kode: 'TIF301', nama: 'Pemrograman Web, Kelas A; Pagi', mulai: '2026-11-16T01:00:00.000Z', selesai: '2026-11-16T02:40:00.000Z', ruang: 'Gedung A · 402', kursi: 'A-17', petugas: [] }

  it('Tenggat untuk penjadwal pengingat', () => {
    expect(sesiKeTenggat(s, 'UTS')).toEqual({ id: 'ujian:uts-TIF301', jenis: 'ujian', judul: 'UTS: Pemrograman Web, Kelas A; Pagi', waktu: '2026-11-16T01:00:00.000Z' })
  })

  it('VEVENT dengan alarm H-1 dan 2 jam, teks di-escape, CRLF', () => {
    const ics = buatIcs([s], () => 'UTS', new Date('2026-10-28T00:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261116T010000Z\r\nDTEND:20261116T024000Z')
    expect(ics).toContain('SUMMARY:UTS: Pemrograman Web\\, Kelas A\\; Pagi')
    expect(ics).toContain('TRIGGER:-P1D')
    expect(ics).toContain('TRIGGER:-PT2H')
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true)
    expect(escIcs('a\\b\nc')).toBe('a\\\\b\\nc')
  })
})
