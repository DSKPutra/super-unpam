import { describe, expect, it } from 'vitest'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { validasiAturan } from './aturan'
import { agregatNilai, csv, csvRekap, kalenderDosen, pengujiTersedia, rekapStatus, ringkasBimbingan, sesiKeAgenda, ubahKuota, urutPerhatian, validasiPenguji, type KonteksPenguji } from './dosen-prodi'
import { pembimbingTersedia, sisaKuota } from './judul'
import type { Dosen, Logbook, SesiUjian, TugasAkhir } from './types'

const NOW = Date.parse('2026-11-20T03:00:00Z')
const dosen = (id: string, terisi = 0, extra: Partial<Dosen> = {}): Dosen => ({ id, nama: `Dosen ${id}`, bidang: [], terisi, ...extra })
const ta = (id: string, status: TugasAkhir['status'], pembimbing: string[] = ['A']): TugasAkhir => ({ id, judul: `Judul ${id}`, abstrak: '', bidang: 'RPL', metode: '', pilihanPembimbing: pembimbing, pembimbing, status, riwayat: [], perubahan: [] })
const sesi = (id: string, mulai: string, selesai: string, petugas: string[], jenis: SesiUjian['jenis'] = 'SIDANG'): SesiUjian => ({ id, jenis, kode: id, nama: id, mulai, selesai, ruang: 'R1', petugas })

describe('konfigurasi', () => {
  it('valid; komposisi penguji masih contoh', () => {
    expect(validasiAturan([ATURAN_BAWAAN])).toEqual([])
    expect(ATURAN_BAWAAN.pengujiUjian.sumber).toBeNull()
    expect(validasiAturan([{ ...ATURAN_BAWAAN, kuotaMaksBimbingan: 3, minimalAgregat: 1 }])).toEqual([
      'prodi "*": kuotaMaksBimbingan tidak boleh di bawah kuotaBimbingan.',
      'prodi "*": minimalAgregat harus bilangan bulat ≥ 2.',
    ])
  })
})

describe('kuota bimbingan', () => {
  it('ubah dalam batas aturan; tidak di bawah terisi; tidak di atas batas', () => {
    expect(ubahKuota(dosen('A', 4), { kuota: 12 }, ATURAN_BAWAAN)).toEqual({ ok: true, dosen: { ...dosen('A', 4), kuota: 12, tutup: false } })
    expect(ubahKuota(dosen('A', 4), { kuota: 13 }, ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Kuota melebihi batas 12 dari aturan prodi.' })
    expect(ubahKuota(dosen('A', 4), { kuota: 3 }, ATURAN_BAWAAN)).toEqual({ ok: false, galat: 'Kuota tidak boleh di bawah jumlah mahasiswa yang sedang dibimbing (4).' })
    expect(ubahKuota(dosen('A'), { kuota: 2.5 }, ATURAN_BAWAAN).ok).toBe(false)
  })

  it('kuota ditutup → dosen tidak bisa dipilih di pengajuan judul (T03)', () => {
    const r = ubahKuota(dosen('A', 1), { tutup: true }, ATURAN_BAWAAN)
    if (!r.ok) throw new Error(r.galat)
    expect(sisaKuota(r.dosen, 10)).toBe(0)
    expect(pembimbingTersedia([r.dosen, dosen('B')], 10).map((d) => d.id)).toEqual(['B'])
  })
})

describe('komposisi penguji', () => {
  const k: KonteksPenguji = {
    jenis: 'SIDANG', namaJenis: 'Sidang Akhir', ta: { pembimbing: ['A'] }, dosen: ['A', 'B', 'C', 'D', 'E'].map((x) => dosen(x)),
    waktu: { id: 'baru', mulai: '2026-12-01T02:00:00Z', selesai: '2026-12-01T04:00:00Z' },
    jadwal: [
      sesi('x', '2026-12-01T03:00:00Z', '2026-12-01T05:00:00Z', ['C']),
      ...[0, 1, 2].map((i) => sesi(`d${i}`, `2026-12-01T${String(5 + i * 2).padStart(2, '0')}:00:00Z`, `2026-12-01T${String(6 + i * 2).padStart(2, '0')}:00:00Z`, ['D'])),
      sesi('uts', '2026-12-01T06:00:00Z', '2026-12-01T07:00:00Z', ['E'], 'UTS'),
    ],
  }

  it('jumlah sesuai jenis, tanpa duplikat, pembimbing tidak menguji, tanpa bentrok, beban harian', () => {
    expect(validasiPenguji(['B', 'E', 'B'], k, ATURAN_BAWAAN)).toEqual(['Penguji yang sama tidak boleh dipilih dua kali.'])
    expect(validasiPenguji(['A', 'B', 'C', 'D'], k, ATURAN_BAWAAN)).toEqual([
      'Sidang Akhir memerlukan tepat 3 penguji (dipilih 4).',
      'Dosen A adalah pembimbing mahasiswa ini dan tidak boleh menguji.',
      'Dosen C sudah memiliki jadwal lain pada waktu itu.',
      'Dosen D sudah menguji 3 kali pada hari itu (batas 3).',
    ])
    expect(validasiPenguji(['B', 'E', 'Z'], k, ATURAN_BAWAAN)).toEqual(['Dosen "Z" tidak dikenal.'])
    // Pengawasan UTS tidak dihitung sebagai beban menguji, dan tidak bentrok di waktu lain.
    expect(validasiPenguji(['B', 'E'], { ...k, jenis: 'PROPOSAL', namaJenis: 'Seminar Proposal' }, ATURAN_BAWAAN)).toEqual([])
  })

  it('aturan dari konfigurasi: pembimbing boleh menguji bila prodi mengizinkan', () => {
    expect(validasiPenguji(['A', 'B', 'E'], k, { pengujiUjian: { ...ATURAN_BAWAAN.pengujiUjian, pembimbingBolehMenguji: true } })).toEqual([])
    expect(pengujiTersedia(k, ATURAN_BAWAAN).map((d) => d.id)).toEqual(['B', 'E'])
  })
})

describe('daftar bimbingan dosen', () => {
  const lb = (entri: Logbook['entri']): Logbook => ({ tugasAkhirId: 't', entri, versi: [] })
  const e = (id: string, tanggal: string, status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK', tenggat?: string) => ({ id, tugasAkhirId: 't', tanggal, bagian: 'Bab', ringkasan: 'r', status, ...(tenggat ? { tugasBerikutnya: { teks: 'Bab 3', tenggat } } : {}) })

  it('jeda lama, entri menunggu, revisi menunggu, tenggat terlewat', () => {
    const r = ringkasBimbingan(ta('t', 'BIMBINGAN'), lb([e('1', '2026-10-01T03:00:00Z', 'DISETUJUI', '2026-10-15T00:00:00Z'), e('2', '2026-10-20T03:00:00Z', 'MENUNGGU')]),
      [{ id: 'r', bagian: 'Bab 2', permintaan: 'p', pengujiId: 'X', status: 'DIAJUKAN', tenggat: '2026-12-01T00:00:00Z' }], NOW, ATURAN_BAWAAN)
    expect(r).toMatchObject({ disetujui: 1, menunggu: 1, revisiMenunggu: 1, terakhir: '2026-10-20T03:00:00Z', tenggatTerdekat: { label: 'Revisi Bab 2' } })
    expect(r.perhatian).toEqual(['Tidak ada bimbingan 31 hari', '1 entri bimbingan menunggu verifikasi', '1 butir revisi menunggu keputusan', 'Ada tenggat yang terlewat'])
  })

  it('tanpa masalah → tidak perlu perhatian; status selesai tidak dicek jedanya', () => {
    expect(ringkasBimbingan(ta('t', 'BIMBINGAN'), lb([e('1', '2026-11-15T03:00:00Z', 'DISETUJUI')]), [], NOW, ATURAN_BAWAAN).perhatian).toEqual([])
    expect(ringkasBimbingan(ta('t', 'SELESAI'), lb([]), [], NOW, ATURAN_BAWAAN).perhatian).toEqual([])
    expect(ringkasBimbingan(ta('t', 'BIMBINGAN'), lb([]), [], NOW, ATURAN_BAWAAN).perhatian).toEqual(['Belum ada bimbingan tercatat'])
    const a = ringkasBimbingan(ta('a', 'BIMBINGAN'), lb([]), [], NOW, ATURAN_BAWAAN)
    const b = ringkasBimbingan(ta('b', 'SELESAI'), lb([]), [], NOW, ATURAN_BAWAAN)
    expect(urutPerhatian([b, a]).map((x) => x.ta.id)).toEqual(['a', 'b'])
  })
})

describe('kalender dosen', () => {
  it('menggabungkan bimbingan, ujian, pengawasan; bentrok terdeteksi', () => {
    const k = kalenderDosen([
      sesiKeAgenda(sesi('uts', '2026-12-01T02:00:00Z', '2026-12-01T04:00:00Z', ['A'], 'UTS'), 'UTS'),
      { id: 'bb', peran: 'BIMBINGAN', judul: 'Bimbingan', mulai: '2026-12-01T03:00:00Z', selesai: '2026-12-01T03:30:00Z', ruang: 'R. Dosen' },
      sesiKeAgenda(sesi('sd', '2026-12-01T04:00:00Z', '2026-12-01T06:00:00Z', ['A']), 'Sidang'),
    ])
    expect(k.agenda.map((a) => [a.id, a.peran])).toEqual([['ujian:uts', 'PENGAWAS'], ['bb', 'BIMBINGAN'], ['ujian:sd', 'PENGUJI']])
    expect(k.bentrok.map(([a, b]) => [a.id, b.id])).toEqual([['ujian:uts', 'bb']])
  })
})

describe('prodi: papan, statistik, rekap', () => {
  it('jumlah per status mencakup semua status', () => {
    const r = rekapStatus([ta('1', 'BIMBINGAN'), ta('2', 'BIMBINGAN'), ta('3', 'SELESAI')])
    expect(r.BIMBINGAN).toBe(2)
    expect(r.SELESAI).toBe(1)
    expect(r.DIAJUKAN).toBe(0)
    expect(Object.keys(r)).toHaveLength(14)
  })

  it('agregat disembunyikan bila data terlalu sedikit; hanya rerata yang ditampilkan', () => {
    expect(agregatNilai([80, 90], 5)).toEqual({ n: 2, tampil: false })
    expect(agregatNilai([70, 80, 90, 75, 85], 5)).toEqual({ n: 5, tampil: true, rerata: 80 })
  })

  it('CSV tanpa data pribadi, aman dari injeksi formula', () => {
    expect(csvRekap([{ kode: 'ta-1', status: 'BIMBINGAN', bidang: 'RPL, Data', bimbinganSah: 3 }])).toBe('kode,status,bidang,bimbingan_sah,ujian_berikutnya\r\nta-1,BIMBINGAN,"RPL, Data",3,\r\n')
    expect(csv([['=HYPERLINK("x")', -1, 'a"b']])).toBe(`"'=HYPERLINK(""x"")",-1,"a""b"\r\n`)
  })
})
