import type { Dosen } from './types.js'

// Utilitas pengajuan tugas akhir (T03): kemiripan judul sederhana, estimasi waktu syarat SKS,
// dan pembimbing yang masih punya kuota. Fungsi murni; tes di judul.test.ts.

/** Kata umum yang tidak membedakan topik judul. */
const STOPWORDS = new Set(['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'dalam', 'sebagai', 'terhadap', 'oleh', 'studi', 'kasus', 'berbasis', 'menggunakan', 'metode', 'sistem', 'aplikasi', 'analisis', 'perancangan', 'implementasi', 'the', 'of', 'a', 'an', 'for', 'in', 'on', 'using', 'based'])

export function tokenJudul(judul: string): Set<string> {
  return new Set(
    judul
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  )
}

/** Koefisien Dice atas kata bermakna, 0 (berbeda) – 1 (sama). */
export function kemiripan(a: string, b: string): number {
  const x = tokenJudul(a)
  const y = tokenJudul(b)
  if (x.size === 0 || y.size === 0) return 0
  let sama = 0
  for (const w of x) if (y.has(w)) sama++
  return (2 * sama) / (x.size + y.size)
}

export interface JudulMirip {
  judul: string
  skor: number
}

/** Judul terdaftar yang skornya ≥ ambang, urut paling mirip. Ini PERINGATAN, bukan penolakan. */
export function judulMirip(judul: string, terdaftar: string[], ambang: number): JudulMirip[] {
  return terdaftar
    .map((t) => ({ judul: t, skor: kemiripan(judul, t) }))
    .filter((m) => m.skor >= ambang)
    .sort((a, b) => b.skor - a.skor || a.judul.localeCompare(b.judul))
}

/** "±N semester lagi" untuk kekurangan SKS; 0 bila sudah cukup. */
export function estimasiSemester(kurangSks: number, sksPerSemester: number): number {
  if (kurangSks <= 0) return 0
  if (!(sksPerSemester > 0)) throw new Error('sksPerSemester harus > 0.')
  return Math.ceil(kurangSks / sksPerSemester)
}

export const sisaKuota = (d: Dosen, kuotaBawaan: number) => (d.tutup ? 0 : Math.max(0, (d.kuota ?? kuotaBawaan) - d.terisi))

/** Dosen yang masih bisa dipilih (kuota tersisa), dosen sebidang didahulukan. */
export function pembimbingTersedia(dosen: Dosen[], kuotaBawaan: number, bidang?: string): Dosen[] {
  return dosen
    .filter((d) => sisaKuota(d, kuotaBawaan) > 0)
    .sort((a, b) => Number(!!bidang && b.bidang.includes(bidang)) - Number(!!bidang && a.bidang.includes(bidang)) || a.nama.localeCompare(b.nama))
}

export interface DataPengajuanJudul {
  judul: string
  bidang: string
  abstrak: string
  metode: string
  pilihanPembimbing: string[]
}

/** Validasi formulir pengajuan; mengembalikan pesan per field (kosong = valid). */
export function validasiPengajuanJudul(d: DataPengajuanJudul, opsi: { maksKarakterJudul: number; jumlahPilihan: number; dosen: Dosen[]; kuotaBawaan: number }): Partial<Record<keyof DataPengajuanJudul, string>> {
  const g: Partial<Record<keyof DataPengajuanJudul, string>> = {}
  const judul = d.judul.trim()
  if (!judul) g.judul = 'Judul wajib diisi.'
  else if (judul.length > opsi.maksKarakterJudul) g.judul = `Judul maksimal ${opsi.maksKarakterJudul} karakter.`
  if (!d.bidang.trim()) g.bidang = 'Pilih bidang keilmuan.'
  if (d.abstrak.trim().length < 50) g.abstrak = 'Abstrak minimal 50 karakter.'
  if (d.metode.trim().length < 20) g.metode = 'Rencana metode minimal 20 karakter.'
  const pilih = d.pilihanPembimbing.filter(Boolean)
  if (pilih.length !== opsi.jumlahPilihan) g.pilihanPembimbing = `Pilih ${opsi.jumlahPilihan} calon pembimbing.`
  else if (new Set(pilih).size !== pilih.length) g.pilihanPembimbing = 'Calon pembimbing tidak boleh sama.'
  else {
    const dipilih = pilih.map((id) => opsi.dosen.find((x) => x.id === id))
    const penuh = dipilih.find((x) => x && sisaKuota(x, opsi.kuotaBawaan) === 0)
    if (dipilih.some((x) => !x)) g.pilihanPembimbing = 'Calon pembimbing tidak dikenal.'
    else if (penuh) g.pilihanPembimbing = `Kuota ${penuh.nama} sudah penuh.`
  }
  return g
}
