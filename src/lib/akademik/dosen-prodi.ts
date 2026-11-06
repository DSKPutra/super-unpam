import type { AturanProdi } from '../../data/aturan-akademik.js'
import { deteksiBentrok } from './bentrok.js'
import { JENIS_UJIAN_AKHIR } from './types.js'
import type { Dosen, JenisUjianAkhir, Logbook, PendaftaranUjianAkhir, Revisi, SesiUjian, StatusTugasAkhir, TugasAkhir } from './types.js'

// Sisi dosen dan prodi (T08): kuota, komposisi penguji, penanda "perlu perhatian", kalender dosen,
// papan kemajuan, rekap CSV, dan statistik agregat. Fungsi murni untuk klien demo dan BFF.

const HARI = 86_400_000

/* ---------------- Kuota bimbingan ---------------- */

type Hasil<T> = { ok: true } & T | { ok: false; galat: string }

/** Dosen membuka/menutup atau mengubah kuota, dalam batas aturan prodi. */
export function ubahKuota(d: Dosen, ubah: { kuota?: number; tutup?: boolean }, aturan: Pick<AturanProdi, 'kuotaBimbingan' | 'kuotaMaksBimbingan'>): Hasil<{ dosen: Dosen }> {
  const kuota = ubah.kuota ?? d.kuota ?? aturan.kuotaBimbingan
  if (!Number.isInteger(kuota) || kuota < 0) return { ok: false, galat: 'Kuota harus bilangan bulat ≥ 0.' }
  if (kuota > aturan.kuotaMaksBimbingan) return { ok: false, galat: `Kuota melebihi batas ${aturan.kuotaMaksBimbingan} dari aturan prodi.` }
  if (kuota < d.terisi) return { ok: false, galat: `Kuota tidak boleh di bawah jumlah mahasiswa yang sedang dibimbing (${d.terisi}).` }
  return { ok: true, dosen: { ...d, kuota, tutup: ubah.tutup ?? d.tutup ?? false } }
}

/* ---------------- Komposisi penguji ---------------- */

const tglWib = (iso: string) => new Date(Date.parse(iso) + 7 * 3_600_000).toISOString().slice(0, 10)

export interface KonteksPenguji {
  jenis: JenisUjianAkhir
  namaJenis: string
  ta: Pick<TugasAkhir, 'pembimbing'>
  dosen: Dosen[]
  /** Waktu ujian yang dijadwalkan. */
  waktu: { id: string; mulai: string; selesai: string }
  /** Jadwal lain semua dosen (ujian akhir, pengawasan) untuk cek bentrok dan beban harian. */
  jadwal: SesiUjian[]
}

/** Daftar pelanggaran aturan komposisi penguji; kosong = sah. */
export function validasiPenguji(penguji: string[], k: KonteksPenguji, aturan: Pick<AturanProdi, 'pengujiUjian'>): string[] {
  const a = aturan.pengujiUjian
  const g: string[] = []
  const nama = (id: string) => k.dosen.find((d) => d.id === id)?.nama ?? id
  const perlu = a.jumlah[k.jenis]
  if (penguji.length !== perlu) g.push(`${k.namaJenis} memerlukan tepat ${perlu} penguji (dipilih ${penguji.length}).`)
  if (new Set(penguji).size !== penguji.length) g.push('Penguji yang sama tidak boleh dipilih dua kali.')
  for (const id of new Set(penguji)) {
    if (!k.dosen.some((d) => d.id === id)) {
      g.push(`Dosen "${id}" tidak dikenal.`)
      continue
    }
    if (!a.pembimbingBolehMenguji && k.ta.pembimbing.includes(id)) g.push(`${nama(id)} adalah pembimbing mahasiswa ini dan tidak boleh menguji.`)
    const lain = k.jadwal.filter((s) => s.id !== k.waktu.id && s.petugas.includes(id))
    if (deteksiBentrok([k.waktu, ...lain]).some((b) => b.a.id === k.waktu.id || b.b.id === k.waktu.id)) g.push(`${nama(id)} sudah memiliki jadwal lain pada waktu itu.`)
    const hari = lain.filter((s) => s.jenis !== 'UTS' && s.jenis !== 'UAS' && tglWib(s.mulai) === tglWib(k.waktu.mulai)).length
    if (hari >= a.maksUjianPerHari) g.push(`${nama(id)} sudah menguji ${hari} kali pada hari itu (batas ${a.maksUjianPerHari}).`)
  }
  return g
}

/** Dosen yang bisa dipilih sebagai penguji pada waktu itu (lolos semua aturan per orang). */
export const pengujiTersedia = (k: KonteksPenguji, aturan: Pick<AturanProdi, 'pengujiUjian'>): Dosen[] =>
  k.dosen.filter((d) => {
    const solo = { ...aturan, pengujiUjian: { ...aturan.pengujiUjian, jumlah: { ...aturan.pengujiUjian.jumlah, [k.jenis]: 1 } } }
    return validasiPenguji([d.id], k, solo).length === 0
  })

/* ---------------- Daftar bimbingan dosen ---------------- */

const AKTIF: StatusTugasAkhir[] = ['DISETUJUI_PEMBIMBING', 'BIMBINGAN', 'LAYAK_PROPOSAL', 'UJIAN_PROPOSAL', 'REVISI_PROPOSAL', 'PENELITIAN', 'LAYAK_UJIAN_AKHIR', 'UJIAN_AKHIR', 'REVISI_AKHIR']

export interface RingkasanMahasiswaBimbingan {
  ta: TugasAkhir
  disetujui: number
  menunggu: number
  /** Pertemuan terakhir (entri apa pun yang tidak ditolak). */
  terakhir?: string
  tenggatTerdekat?: { waktu: string; label: string }
  revisiMenunggu: number
  perhatian: string[]
}

export function ringkasBimbingan(ta: TugasAkhir, lb: Logbook, revisi: Revisi[], now: number, aturan: Pick<AturanProdi, 'jedaBimbinganHari'>): RingkasanMahasiswaBimbingan {
  const sah = lb.entri.filter((e) => e.status !== 'DITOLAK')
  const terakhir = sah.map((e) => e.tanggal).sort().at(-1)
  const disetujui = lb.entri.filter((e) => e.status === 'DISETUJUI').length
  const menunggu = lb.entri.filter((e) => e.status === 'MENUNGGU').length
  const revisiMenunggu = revisi.filter((r) => r.status === 'DIAJUKAN').length
  const tenggat = [
    ...lb.entri.filter((e) => e.tugasBerikutnya?.tenggat).map((e) => ({ waktu: e.tugasBerikutnya!.tenggat!, label: `Tugas: ${e.tugasBerikutnya!.teks}` })),
    ...revisi.filter((r) => r.tenggat && r.status !== 'DISETUJUI').map((r) => ({ waktu: r.tenggat!, label: `Revisi ${r.bagian}` })),
  ].sort((a, b) => a.waktu.localeCompare(b.waktu))
  const perhatian: string[] = []
  if (AKTIF.includes(ta.status)) {
    const jeda = terakhir ? Math.floor((now - Date.parse(terakhir)) / HARI) : null
    if (jeda === null) perhatian.push('Belum ada bimbingan tercatat')
    else if (jeda > aturan.jedaBimbinganHari) perhatian.push(`Tidak ada bimbingan ${jeda} hari`)
  }
  if (menunggu) perhatian.push(`${menunggu} entri bimbingan menunggu verifikasi`)
  if (revisiMenunggu) perhatian.push(`${revisiMenunggu} butir revisi menunggu keputusan`)
  if (tenggat.some((t) => Date.parse(t.waktu) < now)) perhatian.push('Ada tenggat yang terlewat')
  return { ta, disetujui, menunggu, terakhir, tenggatTerdekat: tenggat.find((t) => Date.parse(t.waktu) >= now) ?? tenggat.at(-1), revisiMenunggu, perhatian }
}

/** Yang paling perlu perhatian di atas. */
export const urutPerhatian = (d: RingkasanMahasiswaBimbingan[]) => [...d].sort((a, b) => b.perhatian.length - a.perhatian.length || a.ta.judul.localeCompare(b.ta.judul))

/* ---------------- Kalender dosen ---------------- */

export type PeranAgenda = 'BIMBINGAN' | 'PENGUJI' | 'PENGAWAS'

export interface AgendaDosen {
  id: string
  peran: PeranAgenda
  judul: string
  mulai: string
  selesai: string
  ruang: string
}

/** Agenda urut waktu + pasangan yang bentrok (memakai deteksiBentrok yang sama dengan mahasiswa). */
export function kalenderDosen(agenda: AgendaDosen[]): { agenda: AgendaDosen[]; bentrok: [AgendaDosen, AgendaDosen][] } {
  const urut = [...agenda].sort((a, b) => a.mulai.localeCompare(b.mulai) || a.id.localeCompare(b.id))
  return { agenda: urut, bentrok: deteksiBentrok(urut).map((b) => [b.a, b.b]) }
}

/** Sesi ujian (penguji/pengawas) seorang dosen sebagai agenda. */
export const sesiKeAgenda = (s: SesiUjian, namaJenis: string): AgendaDosen => ({
  id: `ujian:${s.id}`,
  peran: s.jenis === 'UTS' || s.jenis === 'UAS' || s.jenis === 'SUSULAN' || s.jenis === 'REMEDIAL' ? 'PENGAWAS' : 'PENGUJI',
  judul: `${namaJenis}: ${s.nama}`,
  mulai: s.mulai,
  selesai: s.selesai,
  ruang: s.ruang,
})

/* ---------------- Prodi: papan, rekap, statistik ---------------- */

export const URUTAN_STATUS: StatusTugasAkhir[] = ['DRAF_JUDUL', 'DIAJUKAN', 'DITOLAK', 'DISETUJUI_PEMBIMBING', 'BIMBINGAN', 'LAYAK_PROPOSAL', 'UJIAN_PROPOSAL', 'REVISI_PROPOSAL', 'PENELITIAN', 'LAYAK_UJIAN_AKHIR', 'UJIAN_AKHIR', 'REVISI_AKHIR', 'YUDISIUM', 'SELESAI']

export const rekapStatus = (tas: Pick<TugasAkhir, 'status'>[]): Record<StatusTugasAkhir, number> => {
  const r = Object.fromEntries(URUTAN_STATUS.map((s) => [s, 0])) as Record<StatusTugasAkhir, number>
  for (const t of tas) r[t.status]++
  return r
}

/** Agregat nilai: hanya jumlah dan rerata, dan hanya bila n ≥ minimal (nilai individu tidak bisa ditebak). */
export type Agregat = { n: number; tampil: false } | { n: number; tampil: true; rerata: number }

export function agregatNilai(nilai: number[], minimal: number): Agregat {
  if (nilai.length < minimal) return { n: nilai.length, tampil: false }
  return { n: nilai.length, tampil: true, rerata: Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10) / 10 }
}

/** Baris rekap TANPA data pribadi: kode TA, status, bidang, jumlah bimbingan sah, ujian berikutnya. */
export interface BarisRekap {
  kode: string
  status: StatusTugasAkhir
  bidang: string
  bimbinganSah: number
  ujianBerikutnya?: string
}

export const KOLOM_REKAP = ['kode', 'status', 'bidang', 'bimbingan_sah', 'ujian_berikutnya'] as const

/** CSV RFC 4180 dengan perlindungan injeksi formula spreadsheet (= + - @ diawali petik). */
export function csv(baris: (string | number | undefined)[][]): string {
  const sel = (v: string | number | undefined) => {
    let s = v === undefined ? '' : String(v)
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return baris.map((b) => b.map(sel).join(',')).join('\r\n') + '\r\n'
}

export const csvRekap = (rows: BarisRekap[]) => csv([[...KOLOM_REKAP], ...rows.map((r) => [r.kode, r.status, r.bidang, r.bimbinganSah, r.ujianBerikutnya])])

export interface PapanProdi {
  rekap: Record<StatusTugasAkhir, number>
  baris: BarisRekap[]
  menungguPembimbing: TugasAkhir[]
  /** Ujian akhir terjadwal (prodi dapat mengatur penguji). */
  ujian: { ta: TugasAkhir; pendaftaran: PendaftaranUjianAkhir }[]
  /** Hanya agregat; nilai individu tidak pernah dikirim ke papan. */
  statistik: { jenis: JenisUjianAkhir; agregat: Agregat }[]
  /** Semua jadwal dosen (ujian, pengawasan) untuk cek ketersediaan penguji. */
  jadwal: SesiUjian[]
}

/** Dipakai demo dan BFF supaya agregasi selalu terjadi sebelum data sampai ke layar. */
export function susunPapan(m: { tas: TugasAkhir[]; bimbinganSah: Record<string, number>; pendaftaran: PendaftaranUjianAkhir[]; nilai: { jenis: JenisUjianAkhir; nilai: number }[]; jadwal: SesiUjian[]; minimalAgregat: number; now: number }): PapanProdi {
  const terjadwal = m.pendaftaran.filter((p) => p.status === 'TERJADWAL' && p.sesi)
  const berikut = (taId: string) =>
    terjadwal.filter((p) => p.tugasAkhirId === taId && Date.parse(p.sesi!.mulai) >= m.now).sort((a, b) => a.sesi!.mulai.localeCompare(b.sesi!.mulai))[0]
  return {
    rekap: rekapStatus(m.tas),
    baris: m.tas.map((t) => {
      const p = berikut(t.id)
      return { kode: t.id, status: t.status, bidang: t.bidang, bimbinganSah: m.bimbinganSah[t.id] ?? 0, ujianBerikutnya: p ? `${p.jenis} ${p.sesi!.mulai}` : undefined }
    }),
    menungguPembimbing: m.tas.filter((t) => t.status === 'DIAJUKAN'),
    ujian: terjadwal.flatMap((pendaftaran) => {
      const ta = m.tas.find((t) => t.id === pendaftaran.tugasAkhirId)
      return ta ? [{ ta, pendaftaran }] : []
    }),
    statistik: JENIS_UJIAN_AKHIR.map((jenis) => ({ jenis, agregat: agregatNilai(m.nilai.filter((n) => n.jenis === jenis).map((n) => n.nilai), m.minimalAgregat) })),
    jadwal: m.jadwal,
  }
}
