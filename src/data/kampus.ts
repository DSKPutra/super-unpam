// Informasi kampus untuk onboarding dan halaman "Kenali Kampus" (U06).
//
// ATURAN: setiap butir wajib punya `sumber` (URL resmi) dan `dicek` (tanggal dibaca). Field
// `terverifikasi` hanya boleh `true` setelah MANUSIA (humas/LPTI) memastikan isinya. Jangan mengarang
// alamat, koordinat, nomor telepon, jam layanan, atau angka sejarah: kosongkan dan beri TODO.
//
// Semua butir di bawah dibaca dari situs resmi pada 28 Okt 2026 dan BELUM diverifikasi manusia.

export interface Bersumber {
  sumber: string
  /** Tanggal sumber dibaca (YYYY-MM-DD). */
  dicek: string
  terverifikasi: boolean
}

export interface LokasiKampus extends Bersumber {
  id: string
  nama: string
  alamat: string
  /** Sengaja tanpa koordinat: belum ada koordinat resmi. Peta dibuka dengan pencarian alamat. TODO(humas). */
}

export interface Fakultas extends Bersumber {
  id: string
  nama: string
  /** Situs fakultas (daftar prodi lengkap ada di sana). */
  url: string
}

export interface LayananKampus extends Bersumber {
  id: string
  nama: string
  url: string
  /** TODO(humas): jam layanan resmi belum tersedia dari sumber publik. */
  jam?: string
}

export interface KontakResmi extends Bersumber {
  id: string
  label: string
  nilai: string
  href: string
}

const SITUS = 'https://unpam.ac.id/'
const LP3 = 'https://lp3.unpam.ac.id/fakultas-program-studi'
const DICEK = '2026-10-28'
const belum = (sumber: string) => ({ sumber, dicek: DICEK, terverifikasi: false })

export const MOTO = { teks: 'Berbagi Untuk Negeri', ...belum(SITUS) }

/** TODO(humas): sejarah singkat resmi (tahun berdiri, dsb.) belum diambil dari sumber resmi. */
export const SEJARAH: (Bersumber & { teks: string }) | null = null

export const LOKASI: LokasiKampus[] = [
  { id: 'k1', nama: 'Kampus 1 Pusat (Pamulang)', alamat: 'Jl. Surya Kencana No.1, Pamulang Barat, Kec. Pamulang, Kota Tangerang Selatan, Banten 15417', ...belum(SITUS) },
  { id: 'k2', nama: 'Kampus 2 Viktor', alamat: 'Jl. Raya Puspitek, Buaran, Kec. Pamulang, Kota Tangerang Selatan, Banten 15310', ...belum(SITUS) },
  { id: 'k3', nama: 'Kampus 3 Witana Harja', alamat: 'Jl. Witana Harja No.18b, Pamulang Barat, Kec. Pamulang, Kota Tangerang Selatan, Banten 15417', ...belum(SITUS) },
  { id: 'k4', nama: 'Kampus 4 Serang (PSDKU)', alamat: 'Jl. Lintas Serang–Jakarta, Kampung Malandang, Kel. Kelodran, Kec. Walantaka, Kota Serang, Banten 42183', ...belum(SITUS) },
]

export const FAKULTAS: Fakultas[] = [
  { id: 'fai', nama: 'Fakultas Agama Islam', url: 'https://fai.unpam.ac.id/', ...belum(LP3) },
  { id: 'feb', nama: 'FEB', url: 'https://feb.unpam.ac.id/', ...belum(LP3) },
  { id: 'fikom', nama: 'Fakultas Ilmu Komunikasi', url: 'https://fikom.unpam.ac.id/', ...belum(LP3) },
  { id: 'filkom', nama: 'Fakultas Ilmu Komputer', url: 'https://filkom.unpam.ac.id/', ...belum(LP3) },
  { id: 'fkip', nama: 'FKIP', url: 'https://fkip.unpam.ac.id/', ...belum(LP3) },
  { id: 'hukum', nama: 'Fakultas Hukum', url: 'https://hukum.unpam.ac.id/', ...belum(LP3) },
  { id: 'mipa', nama: 'Fakultas MIPA', url: 'https://mipa.unpam.ac.id/', ...belum(LP3) },
  { id: 'sastra', nama: 'Fakultas Sastra', url: 'https://fs.unpam.ac.id/', ...belum(LP3) },
  { id: 'teknik', nama: 'Fakultas Teknik', url: 'https://teknik.unpam.ac.id/', ...belum(LP3) },
  { id: 'pasca', nama: 'Pascasarjana', url: 'https://pascasarjana.unpam.ac.id/', ...belum(LP3) },
]

export const LAYANAN: LayananKampus[] = [
  { id: 'helpdesk', nama: 'Helpdesk', url: 'https://helpdesk.unpam.ac.id/', ...belum(SITUS) },
  { id: 'myunpam', nama: 'My UNPAM', url: 'https://my.unpam.ac.id/', ...belum(SITUS) },
  { id: 'mentari', nama: 'E-Learning (MENTARI)', url: 'https://mentari.unpam.ac.id/', ...belum(SITUS) },
  { id: 'perpustakaan', nama: 'Perpustakaan', url: 'https://perpustakaan.unpam.ac.id/', ...belum(SITUS) },
  { id: 'lb', nama: 'Lembaga Bahasa', url: 'https://lb.unpam.ac.id/', ...belum(SITUS) },
  { id: 'lsp', nama: 'Sertifikasi Profesi (LSP)', url: 'https://lsp.unpam.ac.id/', ...belum(SITUS) },
  { id: 'kemahasiswaan', nama: 'Kemahasiswaan', url: 'https://kemahasiswaan.unpam.ac.id/', ...belum(SITUS) },
  { id: 'pmb', nama: 'Pendaftaran Mahasiswa Baru', url: 'https://pmb.unpam.ac.id/', ...belum(SITUS) },
]

export const KONTAK: KontakResmi[] = [
  { id: 'email', label: 'Email humas', nilai: 'humas@unpam.ac.id', href: 'mailto:humas@unpam.ac.id', ...belum(SITUS) },
  { id: 'wa', label: 'WhatsApp (chat saja)', nilai: '+62 851-9648-3181', href: 'https://wa.me/6285196483181', ...belum(SITUS) },
  { id: 'web', label: 'Situs resmi', nilai: 'unpam.ac.id', href: SITUS, ...belum(SITUS) },
]

/** Tautan peta tanpa pihak ketiga yang di-embed (CSP frame-src 'none'): skema geo: dan pencarian alamat. */
export const tautanPeta = (alamat: string) => ({
  geo: `geo:0,0?q=${encodeURIComponent(alamat)}`,
  web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}`,
})
