import type { Role } from '../types.js'

// Digital Library: katalog koleksi + repositori karya akhir lulusan (skripsi S1, tesis S2, disertasi S3).
// Logika murni dipakai klien (demo) dan BFF. Aturan akses berkas mengikuti pilihan penulis saat unggah:
// TERBUKA (publik), CIVITAS (hanya pengguna SSO UNPAM), EMBARGO (hanya metadata + abstrak sampai tanggal).

export type JenisKarya = 'SKRIPSI' | 'TESIS' | 'DISERTASI'
export type Akses = 'TERBUKA' | 'CIVITAS' | 'EMBARGO'

export interface KaryaAkhir {
  id: string
  jenis: JenisKarya
  judul: string
  penulis: string
  nim: string
  prodi: string
  fakultas: string
  tahunLulus: number
  pembimbing: string[]
  abstrak: string
  kataKunci: string[]
  halaman: number
  akses: Akses
  /** ISO; berlaku bila akses = EMBARGO. */
  embargoSampai?: string
  /** Identitas persisten bila sudah terdaftar, mis. handle/DOI repositori. */
  doi?: string
}

export interface Koleksi {
  id: string
  judul: string
  pengarang: string
  penerbit: string
  tahun: number
  isbn?: string
  jenis: 'BUKU' | 'EBOOK' | 'JURNAL'
  subjek: string[]
  eksemplar: number
  dipinjam: number
  lokasi: string
}

export const LABEL_JENIS: Record<JenisKarya, string> = { SKRIPSI: 'Skripsi (S1)', TESIS: 'Tesis (S2)', DISERTASI: 'Disertasi (S3)' }

export interface FilterKarya {
  q?: string
  jenis?: JenisKarya | ''
  prodi?: string
  tahunDari?: number
  tahunSampai?: number
}

const kata = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 1)

/**
 * Pencarian berperingkat: judul (×5), kata kunci (×4), penulis/pembimbing (×3), abstrak (×1).
 * Semua kata kueri harus muncul di salah satu bidang. Seri: tahun lulus terbaru dulu.
 */
export function cariKarya(semua: KaryaAkhir[], f: FilterKarya): KaryaAkhir[] {
  const kueri = kata(f.q ?? '')
  const hasil: { k: KaryaAkhir; skor: number }[] = []
  for (const k of semua) {
    if (f.jenis && k.jenis !== f.jenis) continue
    if (f.prodi && k.prodi !== f.prodi) continue
    if (f.tahunDari && k.tahunLulus < f.tahunDari) continue
    if (f.tahunSampai && k.tahunLulus > f.tahunSampai) continue
    const bidang: [string[], number][] = [[kata(k.judul), 5], [kata(k.kataKunci.join(' ')), 4], [kata([k.penulis, ...k.pembimbing, k.nim].join(' ')), 3], [kata(k.abstrak), 1]]
    let skor = 0
    let semuaKetemu = true
    for (const w of kueri) {
      const s = bidang.reduce((n, [isi, bobot]) => n + (isi.some((x) => x.startsWith(w)) ? bobot : 0), 0)
      if (!s) semuaKetemu = false
      skor += s
    }
    if (semuaKetemu) hasil.push({ k, skor })
  }
  return hasil.sort((a, b) => b.skor - a.skor || b.k.tahunLulus - a.k.tahunLulus).map((x) => x.k)
}

export type HakBerkas = { boleh: true } | { boleh: false; alasan: string }

/** Siapa boleh membuka teks lengkap. `pengguna` null = pengunjung tanpa masuk. Metadata & abstrak selalu terbuka. */
export function hakBerkas(k: KaryaAkhir, pengguna: { role: Role } | null, now: Date): HakBerkas {
  if (k.akses === 'EMBARGO' && k.embargoSampai && Date.parse(k.embargoSampai) > now.getTime())
    return { boleh: false, alasan: `Teks lengkap diembargo penulis sampai ${new Date(k.embargoSampai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. Abstrak tetap bisa dibaca.` }
  if (k.akses === 'CIVITAS' && !pengguna) return { boleh: false, alasan: 'Teks lengkap hanya untuk civitas UNPAM. Masuk dengan akun SSO.' }
  return { boleh: true }
}

const inisial = (nama: string) => {
  const b = nama.trim().split(/\s+/)
  const akhir = b.pop() ?? ''
  return b.length ? `${akhir}, ${b.map((x) => `${x[0].toUpperCase()}.`).join(' ')}` : akhir
}

/** Sitasi APA edisi 7 untuk karya akhir yang tidak diterbitkan. */
export function sitasiAPA(k: KaryaAkhir): string {
  const jenis = { SKRIPSI: 'Skripsi sarjana', TESIS: 'Tesis magister', DISERTASI: 'Disertasi doktoral' }[k.jenis]
  return `${inisial(k.penulis)} (${k.tahunLulus}). ${k.judul} [${jenis}, Universitas Pamulang].${k.doi ? ` ${k.doi}` : ''}`
}

/** Sitasi BibTeX (@phdthesis untuk disertasi, @mastersthesis untuk tesis, @misc untuk skripsi). */
export function sitasiBibtex(k: KaryaAkhir): string {
  const tipe = k.jenis === 'DISERTASI' ? 'phdthesis' : k.jenis === 'TESIS' ? 'mastersthesis' : 'misc'
  const kunci = `${kata(k.penulis).pop() ?? 'anon'}${k.tahunLulus}`
  const bidang = [`  author = {${k.penulis}}`, `  title = {${k.judul}}`, `  school = {Universitas Pamulang}`, `  year = {${k.tahunLulus}}`]
  if (tipe === 'misc') bidang.push('  note = {Skripsi sarjana}')
  if (k.doi) bidang.push(`  url = {${k.doi}}`)
  return `@${tipe}{${kunci},\n${bidang.join(',\n')}\n}`
}

/** Ringkasan repositori per jenis dan tahun untuk statistik singkat. */
export function statistik(semua: KaryaAkhir[]) {
  const perJenis = { SKRIPSI: 0, TESIS: 0, DISERTASI: 0 } as Record<JenisKarya, number>
  for (const k of semua) perJenis[k.jenis]++
  return { total: semua.length, perJenis, prodi: [...new Set(semua.map((k) => k.prodi))].sort() }
}

export const tersedia = (k: Koleksi) => Math.max(0, k.eksemplar - k.dipinjam)

export function cariKoleksi(semua: Koleksi[], q: string): Koleksi[] {
  const kueri = kata(q)
  return semua.filter((k) => {
    const isi = kata([k.judul, k.pengarang, k.penerbit, k.isbn ?? '', ...k.subjek].join(' '))
    return kueri.every((w) => isi.some((x) => x.startsWith(w)))
  })
}
