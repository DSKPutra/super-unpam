// Aturan parkir kampus sebagai DATA (bukan tersebar di kode UI).
// CONTOH: semua angka di bawah belum resmi. TODO(Sarpras/BAU): ganti dengan ketentuan parkir UNPAM yang berlaku
// (jumlah kendaraan per mahasiswa, area & kapasitas, jam operasional, tarif/retribusi bila ada).

export type JenisKendaraan = 'motor' | 'mobil'

export interface AturanArea {
  id: string
  nama: string
  kampus: string
  jenis: JenisKendaraan
  kapasitas: number
}

export interface AturanParkir {
  /** true selama aturan masih contoh; UI menampilkan label "contoh". */
  contoh: boolean
  /** Maksimum kendaraan terdaftar per pemegang KTM. */
  maksKendaraan: number
  jenis: Record<JenisKendaraan, { label: string; /** Rupiah per masuk; null = belum ditetapkan / gratis. */ tarifPerMasuk: number | null }>
  /** Jam operasional gerbang (WIB, "HH:MM"). Kendaraan tetap boleh KELUAR di luar jam ini. */
  jamOperasi: { buka: string; tutup: string }
  /** Parkir lebih lama dari ini ditandai "menginap" dan wajib dicek petugas saat keluar. */
  batasInapJam: number
  /** Persen keterisian untuk label "ramai". */
  ambangRamai: number
  area: AturanArea[]
  /** Berkas STNK yang diterima saat pendaftaran kendaraan. */
  stnk: { tipe: string[]; maksByte: number }
}

export const ATURAN_PARKIR: AturanParkir = {
  contoh: true,
  maksKendaraan: 2,
  jenis: {
    motor: { label: 'Motor', tarifPerMasuk: null },
    mobil: { label: 'Mobil', tarifPerMasuk: null },
  },
  jamOperasi: { buka: '05:30', tutup: '22:30' },
  batasInapJam: 16,
  ambangRamai: 80,
  area: [
    { id: 'PML-M1', nama: 'Parkir Motor Gedung A', kampus: 'Kampus Pamulang', jenis: 'motor', kapasitas: 900 },
    { id: 'PML-C1', nama: 'Parkir Mobil Depan Rektorat', kampus: 'Kampus Pamulang', jenis: 'mobil', kapasitas: 120 },
    { id: 'VKT-M1', nama: 'Parkir Motor Basement', kampus: 'Kampus Viktor', jenis: 'motor', kapasitas: 1500 },
    { id: 'VKT-C1', nama: 'Parkir Mobil Basement', kampus: 'Kampus Viktor', jenis: 'mobil', kapasitas: 200 },
  ],
  stnk: { tipe: ['application/pdf', 'image/jpeg', 'image/png'], maksByte: 2 * 1024 * 1024 },
}
