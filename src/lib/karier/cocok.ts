import type { Role } from '../types.js'

// Karier & lowongan (job matching). Logika murni: dipakai klien (mode demo) dan BFF (api/karier).
// Pemasang = siapa pun yang masuk lewat SSO UNPAM (mahasiswa, alumni, dosen, tendik). Tidak ada KYB:
// pencegahan penipuan = identitas terverifikasi SSO + pemeriksaan isi lowongan + laporan komunitas + moderasi.

export type TipeKerja = 'PENUH_WAKTU' | 'PARUH_WAKTU' | 'MAGANG' | 'KONTRAK' | 'FREELANCE'
export type ModeKerja = 'KANTOR' | 'HIBRIDA' | 'REMOTE'
export type Level = 'MAGANG' | 'JUNIOR' | 'MENENGAH' | 'SENIOR'
export type StatusLowongan = 'AKTIF' | 'DITINJAU' | 'DITUTUP' | 'DISEMBUNYIKAN' | 'DITOLAK'
export type StatusLamaran = 'TERKIRIM' | 'DILIHAT' | 'DIPROSES' | 'DITOLAK' | 'DITERIMA'

export interface Orang {
  sub: string
  nama: string
  role: Role
  prodi: string
}

export interface InputLowongan {
  judul: string
  perusahaan: string
  lokasi: string
  mode: ModeKerja
  tipe: TipeKerja
  level: Level
  keahlian: string[]
  gajiMin?: number
  gajiMax?: number
  deskripsi: string
  /** Kosong = melamar di dalam aplikasi (disarankan). */
  tautan?: string
  hariAktif: number
}

export interface Lowongan extends Omit<InputLowongan, 'hariAktif'> {
  id: string
  pemasang: Orang
  dibuat: string
  kedaluwarsa: string
  status: StatusLowongan
  /** sub pelapor (unik); disembunyikan otomatis bila mencapai AMBANG_LAPORAN. */
  pelapor: string[]
  risiko: Risiko
  temuan: string[]
}

export interface ProfilKerja {
  keahlian: string[]
  level: Level
  tipe: TipeKerja[]
  mode: ModeKerja[]
  lokasi: string[]
  gajiHarapan?: number
  ringkasan: string
}

export interface Lamaran {
  id: string
  lowonganId: string
  pelamar: Orang
  profil: ProfilKerja
  pesan: string
  dibuat: string
  status: StatusLamaran
  skor: number
}

export type Risiko = 'RENDAH' | 'SEDANG' | 'TINGGI'

export const ATURAN_KARIER = {
  maksLowonganAktif: 5,
  maksHariAktif: 60,
  ambangLaporan: 3,
  /** Batas wajar gaji/bulan (Rp) per level; di atas ini ditandai untuk ditinjau. TODO(CDC): sesuaikan data pasar. */
  gajiWajarMaks: { MAGANG: 8_000_000, JUNIOR: 20_000_000, MENENGAH: 45_000_000, SENIOR: 150_000_000 } satisfies Record<Level, number>,
} as const

export const LABEL_TIPE: Record<TipeKerja, string> = { PENUH_WAKTU: 'Penuh waktu', PARUH_WAKTU: 'Paruh waktu', MAGANG: 'Magang', KONTRAK: 'Kontrak', FREELANCE: 'Freelance' }
export const LABEL_MODE: Record<ModeKerja, string> = { KANTOR: 'Di kantor', HIBRIDA: 'Hibrida', REMOTE: 'Remote' }
export const LABEL_LEVEL: Record<Level, string> = { MAGANG: 'Magang/Fresh graduate', JUNIOR: 'Junior', MENENGAH: 'Menengah', SENIOR: 'Senior' }
const URUT_LEVEL: Level[] = ['MAGANG', 'JUNIOR', 'MENENGAH', 'SENIOR']

const ALIAS: Record<string, string> = {
  js: 'javascript', ts: 'typescript', reactjs: 'react', 'react.js': 'react', nodejs: 'node.js', node: 'node.js',
  py: 'python', 'ms excel': 'excel', 'microsoft excel': 'excel', postgres: 'postgresql', golang: 'go',
  'ui/ux': 'ui/ux', uiux: 'ui/ux', ux: 'ui/ux', akuntansi: 'akuntansi', accounting: 'akuntansi',
}

/** Normalisasi keahlian: huruf kecil, rapikan spasi, alias umum, buang duplikat. */
export function normalKeahlian(daftar: string[]): string[] {
  const hasil = daftar.map((k) => k.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean).map((k) => ALIAS[k] ?? k)
  return [...new Set(hasil)].slice(0, 30)
}

export interface Kecocokan {
  skor: number
  alasan: string[]
  kurang: string[]
}

/**
 * Skor 0–100: keahlian 50, level 15, tipe 10, mode kerja 10, lokasi 10, gaji 5.
 * Transparan: setiap poin disertai alasan agar pengguna tahu kenapa lowongan disarankan.
 */
export function skorCocok(p: ProfilKerja, l: Pick<Lowongan, 'keahlian' | 'level' | 'tipe' | 'mode' | 'lokasi' | 'gajiMax'>): Kecocokan {
  const punya = new Set(normalKeahlian(p.keahlian))
  const butuh = normalKeahlian(l.keahlian)
  const cocok = butuh.filter((k) => punya.has(k))
  const kurang = butuh.filter((k) => !punya.has(k))
  const alasan: string[] = []
  let skor = butuh.length ? (cocok.length / butuh.length) * 50 : 25
  if (cocok.length) alasan.push(`${cocok.length} dari ${butuh.length} keahlian cocok`)

  const selisih = Math.abs(URUT_LEVEL.indexOf(p.level) - URUT_LEVEL.indexOf(l.level))
  skor += [15, 8, 0, 0][selisih]
  if (selisih === 0) alasan.push('Level sesuai')

  if (!p.tipe.length || p.tipe.includes(l.tipe)) (skor += 10), alasan.push(LABEL_TIPE[l.tipe])
  if (!p.mode.length || p.mode.includes(l.mode)) (skor += 10), alasan.push(LABEL_MODE[l.mode])

  const lokasiCocok = l.mode === 'REMOTE' || !p.lokasi.length || p.lokasi.some((x) => l.lokasi.toLowerCase().includes(x.trim().toLowerCase()))
  if (lokasiCocok) (skor += 10), l.mode !== 'REMOTE' && p.lokasi.length && alasan.push(`Lokasi ${l.lokasi}`)

  if (!p.gajiHarapan || !l.gajiMax || l.gajiMax >= p.gajiHarapan) skor += 5
  return { skor: Math.round(skor), alasan, kurang }
}

const POLA_FRAUD: [RegExp, string][] = [
  [/\b(biaya|uang)\s+(pendaftaran|administrasi|seragam|pelatihan|training|jaminan|deposit)\b|\bdeposit\b|\btransfer\s+(dulu|terlebih)|\bbayar\s+(di\s*muka|dulu)/i, 'Meminta pelamar membayar (biaya daftar, deposit, pelatihan). Lowongan resmi tidak memungut biaya.'],
  [/\b(nomor\s+)?(rekening|pin|otp|kata\s*sandi|password)\b|\bfoto\s+ktp\b|\bselfie\s+(dengan\s+)?ktp\b/i, 'Meminta data sensitif (rekening, PIN/OTP, kata sandi, foto KTP).'],
  [/\b(wa|whatsapp|telegram|tele)\s*(only|saja)\b|\bhubungi\s+(wa|whatsapp|telegram)\b|(\+?62|0)8\d{8,11}/i, 'Mengarahkan kontak ke WhatsApp/Telegram atau mencantumkan nomor HP. Gunakan tombol Lamar di aplikasi.'],
  [/\b(tanpa\s+pengalaman.{0,30}gaji\s+(besar|tinggi|jutaan))|\b(kerja\s+santai|cuan|passive\s+income|investasi|like\s+(dan|&)\s+(share|subscribe)|tugas\s+like)\b/i, 'Pola "kerja mudah gaji besar" / tugas like-share / investasi, sering dipakai penipuan.'],
]
const PEMENDEK = /\b(bit\.ly|s\.id|tinyurl\.com|t\.co|cutt\.ly|shorturl\.at|rebrand\.ly|linktr\.ee)\b/i

/** Pemeriksaan isi lowongan. TINGGI = masuk antrean tinjau (tidak tayang) sampai moderator menyetujui. */
export function periksaFraud(l: InputLowongan): { risiko: Risiko; temuan: string[] } {
  const teks = [l.judul, l.perusahaan, l.deskripsi].join('\n')
  const temuan = POLA_FRAUD.filter(([re]) => re.test(teks)).map(([, pesan]) => pesan)
  let berat = temuan.length * 2
  if (l.tautan) {
    let url: URL | null = null
    try {
      url = new URL(l.tautan)
    } catch {
      /* ditangani di bawah */
    }
    if (!url || url.protocol !== 'https:') (berat += 2), temuan.push('Tautan melamar bukan https.')
    else if (PEMENDEK.test(url.hostname)) (berat += 2), temuan.push('Tautan memakai pemendek URL; tujuan sebenarnya tersembunyi.')
  }
  if (l.gajiMin && l.gajiMax && l.gajiMin > l.gajiMax) (berat += 1), temuan.push('Gaji minimum lebih besar dari maksimum.')
  if ((l.gajiMax ?? 0) > ATURAN_KARIER.gajiWajarMaks[l.level]) (berat += 1), temuan.push(`Gaji tidak wajar untuk level ${LABEL_LEVEL[l.level]}.`)
  if (l.judul.length >= 12 && l.judul.replace(/[^A-Z]/g, '').length / l.judul.replace(/[^A-Za-z]/g, '').length > 0.7) (berat += 1), temuan.push('Judul ditulis kapital semua.')
  return { risiko: berat >= 2 ? 'TINGGI' : berat === 1 ? 'SEDANG' : 'RENDAH', temuan }
}

/** Galat validasi input pemasang (string) atau null bila boleh dipasang. */
export function validasiPasang(l: InputLowongan, aktifMilikSaya: number): string | null {
  if (aktifMilikSaya >= ATURAN_KARIER.maksLowonganAktif) return `Maksimal ${ATURAN_KARIER.maksLowonganAktif} lowongan aktif per akun. Tutup lowongan lama terlebih dahulu.`
  if (l.judul.trim().length < 5 || l.perusahaan.trim().length < 2 || l.lokasi.trim().length < 2) return 'Judul, perusahaan, dan lokasi wajib diisi.'
  if (l.deskripsi.trim().length < 40) return 'Deskripsi minimal 40 karakter: tanggung jawab, kualifikasi, dan proses seleksi.'
  if (!normalKeahlian(l.keahlian).length) return 'Isi minimal satu keahlian yang dibutuhkan.'
  if (l.hariAktif < 1 || l.hariAktif > ATURAN_KARIER.maksHariAktif) return `Masa tayang 1–${ATURAN_KARIER.maksHariAktif} hari.`
  return null
}

export function buatLowongan(id: string, input: InputLowongan, pemasang: Orang, now: Date): Lowongan {
  const { hariAktif, ...isi } = input
  const { risiko, temuan } = periksaFraud(input)
  return {
    ...isi,
    keahlian: normalKeahlian(input.keahlian),
    tautan: input.tautan?.trim() || undefined,
    id,
    pemasang,
    dibuat: now.toISOString(),
    kedaluwarsa: new Date(now.getTime() + hariAktif * 86_400_000).toISOString(),
    status: risiko === 'TINGGI' ? 'DITINJAU' : 'AKTIF',
    pelapor: [],
    risiko,
    temuan,
  }
}

export const tayang = (l: Lowongan, now: Date) => l.status === 'AKTIF' && Date.parse(l.kedaluwarsa) > now.getTime()

/** Lowongan yang tampil untuk pencari, diurutkan dari paling cocok. Lowongan sendiri tidak disarankan. */
export function rekomendasi(semua: Lowongan[], p: ProfilKerja, aku: string, now: Date, q = ''): (Lowongan & Kecocokan)[] {
  const kata = q.trim().toLowerCase()
  return semua
    .filter((l) => tayang(l, now) && l.pemasang.sub !== aku)
    .filter((l) => !kata || [l.judul, l.perusahaan, l.lokasi, ...l.keahlian].join(' ').toLowerCase().includes(kata))
    .map((l) => ({ ...l, ...skorCocok(p, l) }))
    .sort((a, b) => b.skor - a.skor || b.dibuat.localeCompare(a.dibuat))
}

/** Laporan unik per pengguna; pemasang tidak bisa melaporkan miliknya. Disembunyikan otomatis di ambang. */
export function laporkan(l: Lowongan, pelapor: string): Lowongan {
  if (l.pemasang.sub === pelapor || l.pelapor.includes(pelapor)) return l
  const daftar = [...l.pelapor, pelapor]
  return { ...l, pelapor: daftar, status: daftar.length >= ATURAN_KARIER.ambangLaporan && l.status === 'AKTIF' ? 'DISEMBUNYIKAN' : l.status }
}

/** Satu lamaran per lowongan per pelamar (idempoten). Tidak bisa melamar lowongan sendiri / yang tidak tayang. */
export function lamar(semua: Lamaran[], l: Lowongan, pelamar: Orang, profil: ProfilKerja, pesan: string, id: string, now: Date): { lamaran: Lamaran; baru: boolean } | string {
  if (l.pemasang.sub === pelamar.sub) return 'Tidak bisa melamar lowongan sendiri.'
  if (!tayang(l, now)) return 'Lowongan sudah tidak menerima lamaran.'
  const ada = semua.find((x) => x.lowonganId === l.id && x.pelamar.sub === pelamar.sub)
  if (ada) return { lamaran: ada, baru: false }
  const lamaran: Lamaran = { id, lowonganId: l.id, pelamar, profil, pesan: pesan.trim().slice(0, 1000), dibuat: now.toISOString(), status: 'TERKIRIM', skor: skorCocok(profil, l).skor }
  return { lamaran, baru: true }
}

export const urutPelamar = (daftar: Lamaran[]) => [...daftar].sort((a, b) => b.skor - a.skor || a.dibuat.localeCompare(b.dibuat))
