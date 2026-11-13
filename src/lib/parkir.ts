import type { AturanParkir, JenisKendaraan } from '../data/aturan-parkir.js'

// Parkir kampus dengan KTM Digital (inti murni, dipakai klien demo DAN server BFF):
// - QR parkir memuat ID kendaraan (bukan plat/NIM) dan berganti tiap 30 detik seperti QR KTM.
// - Gerbang menerapkan anti-passback: tidak bisa masuk dua kali tanpa keluar, tidak bisa keluar tanpa
//   tercatat masuk, dan keluar harus dengan kendaraan yang sama dengan saat masuk.
// - KTM yang dibekukan (mis. HP hilang) tidak bisa dipakai di gerbang.

export type { JenisKendaraan }
export type StatusKendaraan = 'menunggu' | 'terverifikasi' | 'ditolak'
export type Arah = 'masuk' | 'keluar'

export interface Kendaraan {
  id: string
  plat: string
  jenis: JenisKendaraan
  merek: string
  warna: string
  status: StatusKendaraan
  /** Alasan bila ditolak verifikasi. */
  catatan?: string
  /** Metadata berkas STNK (bukan isinya). */
  stnk?: { nama: string; ukuran: number }
}

export interface AreaParkir {
  id: string
  nama: string
  kampus: string
  jenis: JenisKendaraan
  kapasitas: number
  terisi: number
}

export interface SesiParkir {
  id: string
  kendaraanId: string
  plat: string
  areaId: string
  areaNama: string
  /** ISO 8601. */
  masuk: string
  keluar?: string
  /** Rupiah; null = tidak ada tarif yang ditetapkan. */
  tarif?: number | null
  menginap?: boolean
}

export type JenisLog = 'parkir-masuk' | 'parkir-keluar' | 'gedung' | 'perpustakaan' | 'presensi' | 'ujian' | 'keamanan'

export interface LogAkses {
  id: string
  waktu: string
  jenis: JenisLog
  lokasi: string
  ket?: string
}

export interface KeadaanParkir {
  ktmBeku: boolean
  kendaraan: Kendaraan[]
  /** Sesi yang sedang berjalan (belum keluar), paling banyak satu per pemegang KTM. */
  sesiAktif: SesiParkir | null
}

// — Plat nomor —

const POLA_PLAT = /^([A-Z]{1,2}) ?(\d{1,4}) ?([A-Z]{0,3})$/

/** "b1234xyz", " B-1234-XYZ " → "B 1234 XYZ"; mengembalikan null bila bukan format plat Indonesia. */
export function normalisasiPlat(masukan: string): string | null {
  const s = masukan.toUpperCase().replace(/[\s.-]+/g, ' ').trim()
  const m = POLA_PLAT.exec(s) ?? POLA_PLAT.exec(s.replace(/ /g, ''))
  if (!m) return null
  return [m[1], m[2], m[3]].filter(Boolean).join(' ')
}

export interface InputKendaraan {
  plat: string
  jenis: JenisKendaraan
  merek: string
  warna: string
  stnk?: { nama: string; ukuran: number; tipe: string }
}

/** Validasi pendaftaran kendaraan baru. Mengembalikan daftar pesan galat (kosong = boleh). */
export function validasiKendaraan(input: InputKendaraan, milik: Kendaraan[], aturan: AturanParkir): string[] {
  const galat: string[] = []
  const plat = normalisasiPlat(input.plat)
  if (!plat) galat.push('Format plat nomor tidak dikenali (contoh: B 1234 XYZ).')
  else if (milik.some((k) => k.plat === plat)) galat.push(`Plat ${plat} sudah terdaftar di akun Anda.`)
  const aktif = milik.filter((k) => k.status !== 'ditolak')
  if (aktif.length >= aturan.maksKendaraan) galat.push(`Maksimal ${aturan.maksKendaraan} kendaraan per KTM. Hapus salah satu dulu.`)
  if (!aturan.jenis[input.jenis]) galat.push('Jenis kendaraan tidak dikenal.')
  if (!input.merek.trim()) galat.push('Isi merek/tipe kendaraan.')
  if (!input.warna.trim()) galat.push('Isi warna kendaraan.')
  if (!input.stnk) galat.push('Unggah foto/scan STNK.')
  else {
    if (!aturan.stnk.tipe.includes(input.stnk.tipe)) galat.push('STNK harus berupa PDF, JPG, atau PNG.')
    if (input.stnk.ukuran > aturan.stnk.maksByte) galat.push(`Ukuran STNK maksimal ${Math.round(aturan.stnk.maksByte / 1024 / 1024)} MB.`)
  }
  return galat
}

// — Waktu (WIB) —

/** Menit sejak tengah malam WIB. */
export const menitWib = (d: Date) => {
  const t = new Date(d.getTime() + 7 * 3600_000)
  return t.getUTCHours() * 60 + t.getUTCMinutes()
}
const keMenit = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const dalamJamOperasi = (d: Date, aturan: AturanParkir) => {
  const m = menitWib(d)
  return m >= keMenit(aturan.jamOperasi.buka) && m < keMenit(aturan.jamOperasi.tutup)
}

export const durasiMenit = (masuk: string, keluar: string | Date) =>
  Math.max(0, Math.floor(((typeof keluar === 'string' ? new Date(keluar) : keluar).getTime() - new Date(masuk).getTime()) / 60_000))

export function formatDurasi(menit: number) {
  if (menit < 60) return `${menit} mnt`
  const j = Math.floor(menit / 60)
  const m = menit % 60
  return m ? `${j} j ${m} mnt` : `${j} jam`
}

// — Area —

export type TingkatOkupansi = 'lengang' | 'ramai' | 'penuh'
export function okupansi(a: Pick<AreaParkir, 'kapasitas' | 'terisi'>, aturan: AturanParkir): { persen: number; tingkat: TingkatOkupansi; sisa: number } {
  const sisa = Math.max(0, a.kapasitas - a.terisi)
  const persen = a.kapasitas ? Math.min(100, Math.round((a.terisi / a.kapasitas) * 100)) : 100
  return { persen, sisa, tingkat: sisa === 0 ? 'penuh' : persen >= aturan.ambangRamai ? 'ramai' : 'lengang' }
}

// — Gerbang —

export interface PindaiGerbang {
  arah: Arah
  kendaraanId: string
  areaId: string
  waktu: Date
  /** Untuk ID sesi baru. */
  idBaru: string
}

export type HasilGerbang =
  | { ok: true; arah: Arah; sesi: SesiParkir; kendaraan: Kendaraan; pesan: string }
  | { ok: false; alasan: string; kendaraan?: Kendaraan }

/**
 * Keputusan gerbang. Fungsi murni: tidak mengubah `keadaan` maupun `area`; pemanggil yang menyimpan
 * sesi hasil dan memperbarui keterisian area.
 */
export function prosesGerbang(keadaan: KeadaanParkir, area: AreaParkir[], p: PindaiGerbang, aturan: AturanParkir): HasilGerbang {
  if (keadaan.ktmBeku) return { ok: false, alasan: 'KTM sedang dibekukan pemiliknya. Arahkan ke pos keamanan.' }
  const kendaraan = keadaan.kendaraan.find((k) => k.id === p.kendaraanId)
  if (!kendaraan) return { ok: false, alasan: 'Kendaraan tidak terdaftar di KTM ini.' }
  if (kendaraan.status !== 'terverifikasi')
    return { ok: false, kendaraan, alasan: kendaraan.status === 'menunggu' ? 'Kendaraan belum diverifikasi Sarpras.' : 'Pendaftaran kendaraan ditolak.' }

  const lokasi = area.find((a) => a.id === p.areaId)
  if (!lokasi) return { ok: false, kendaraan, alasan: 'Gerbang/area parkir tidak dikenal.' }
  const aktif = keadaan.sesiAktif

  if (p.arah === 'masuk') {
    if (aktif)
      return {
        ok: false,
        kendaraan,
        alasan: `Anti-passback: ${aktif.plat} masih tercatat parkir di ${aktif.areaNama}. Keluar dulu sebelum masuk lagi.`,
      }
    if (lokasi.jenis !== kendaraan.jenis) return { ok: false, kendaraan, alasan: `Area ini khusus ${aturan.jenis[lokasi.jenis].label.toLowerCase()}.` }
    if (!dalamJamOperasi(p.waktu, aturan)) return { ok: false, kendaraan, alasan: `Di luar jam operasional (${aturan.jamOperasi.buka}–${aturan.jamOperasi.tutup} WIB).` }
    if (okupansi(lokasi, aturan).tingkat === 'penuh') return { ok: false, kendaraan, alasan: `${lokasi.nama} penuh. Gunakan area lain.` }
    const sesi: SesiParkir = { id: p.idBaru, kendaraanId: kendaraan.id, plat: kendaraan.plat, areaId: lokasi.id, areaNama: lokasi.nama, masuk: p.waktu.toISOString() }
    return { ok: true, arah: 'masuk', sesi, kendaraan, pesan: `Silakan masuk. ${kendaraan.plat} tercatat di ${lokasi.nama}.` }
  }

  if (!aktif) return { ok: false, kendaraan, alasan: 'Tidak ada catatan masuk untuk KTM ini. Hubungi petugas.' }
  if (aktif.kendaraanId !== kendaraan.id)
    return { ok: false, kendaraan, alasan: `Kendaraan berbeda dengan saat masuk (${aktif.plat}). Hubungi petugas.` }
  const menit = durasiMenit(aktif.masuk, p.waktu)
  const menginap = menit > aturan.batasInapJam * 60
  const sesi: SesiParkir = { ...aktif, keluar: p.waktu.toISOString(), tarif: aturan.jenis[kendaraan.jenis].tarifPerMasuk, menginap }
  return {
    ok: true,
    arah: 'keluar',
    sesi,
    kendaraan,
    pesan: `Hati-hati di jalan. Durasi parkir ${formatDurasi(menit)}${menginap ? ' (menginap, dicek petugas)' : ''}.`,
  }
}

/** Arah yang diharapkan di gerbang berikutnya. */
export const arahBerikutnya = (k: Pick<KeadaanParkir, 'sesiAktif'>): Arah => (k.sesiAktif ? 'keluar' : 'masuk')

/** Kendaraan boleh dihapus selama tidak sedang parkir. */
export const bolehHapus = (k: Pick<KeadaanParkir, 'sesiAktif'>, id: string) => k.sesiAktif?.kendaraanId !== id
