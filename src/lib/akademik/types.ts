// Tipe domain ujian dan skripsi/tugas akhir (T01). Murni TypeScript, tanpa React/DOM.
// Semua tanggal ISO 8601; tampilan memakai WIB.

export type JenisUjian = 'UTS' | 'UAS' | 'SUSULAN' | 'REMEDIAL' | 'PROPOSAL' | 'SEMINAR_HASIL' | 'UAPS' | 'SIDANG'

export const JENIS_UJIAN_SEMESTER = ['UTS', 'UAS', 'SUSULAN', 'REMEDIAL'] as const satisfies readonly JenisUjian[]
export const JENIS_UJIAN_AKHIR = ['PROPOSAL', 'SEMINAR_HASIL', 'UAPS', 'SIDANG'] as const satisfies readonly JenisUjian[]

export interface SesiUjian {
  id: string
  jenis: JenisUjian
  /** Kode mata kuliah (ujian semester) atau id tugas akhir (ujian akhir). */
  kode: string
  nama: string
  mulai: string
  selesai: string
  ruang: string
  kursi?: string
  /** Pengawas (ujian semester) atau penguji (ujian akhir). */
  petugas: string[]
  /** Diisi bila jadwal pernah berubah: jadwal sebelumnya, untuk penanda "Berubah". */
  sebelumnya?: { mulai: string; selesai: string; ruang: string }
}

export interface Ujian {
  jenis: JenisUjian
  semester: string
  sesi: SesiUjian[]
}

/** Data mahasiswa yang dibutuhkan untuk menilai kelayakan. Berasal dari server (MY UNPAM/SISKEMU). */
export interface ProfilKelayakan {
  prodi: string
  /** Persentase kehadiran per kode mata kuliah, 0–100. */
  kehadiran: Record<string, number>
  keuanganLunas: boolean
  sks: number
  ipk: number
  bimbinganDisetujui: number
  persetujuanPembimbing: boolean
  /** Id berkas yang sudah diverifikasi. */
  berkas: string[]
  /** Kode mata kuliah wajib yang sudah lulus. */
  mkLulus: string[]
}

export interface HasilSyarat {
  id: string
  label: string
  terpenuhi: boolean
  /** Kalimat yang bisa ditindaklanjuti, mis. "Kehadiran 68%, minimal 75%". */
  alasan: string
  /** Rute aplikasi untuk memperbaiki, mis. "keuangan". */
  tautanPerbaikan?: string
  /** true bila ambangnya masih nilai contoh (belum diverifikasi BAAK). */
  contoh: boolean
}

export interface HasilKelayakan {
  layak: boolean
  syarat: HasilSyarat[]
}

export type StatusTugasAkhir =
  | 'DRAF_JUDUL'
  | 'DIAJUKAN'
  | 'DITOLAK'
  | 'DISETUJUI_PEMBIMBING'
  | 'BIMBINGAN'
  | 'LAYAK_PROPOSAL'
  | 'UJIAN_PROPOSAL'
  | 'REVISI_PROPOSAL'
  | 'PENELITIAN'
  | 'LAYAK_UJIAN_AKHIR'
  | 'UJIAN_AKHIR'
  | 'REVISI_AKHIR'
  | 'YUDISIUM'
  | 'SELESAI'

export type PeranAlur = 'MAHASISWA' | 'DOSEN' | 'PRODI'

export interface RiwayatAlur {
  dari: StatusTugasAkhir
  ke: StatusTugasAkhir
  peristiwa: string
  pelaku: PeranAlur
  waktu: string
  catatan?: string
}

export interface PermintaanPerubahan {
  id: string
  jenis: 'JUDUL' | 'PEMBIMBING'
  usulan: string
  alasan: string
  status: 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK'
  diajukan: string
}

export interface TugasAkhir {
  id: string
  judul: string
  abstrak: string
  bidang: string
  metode: string
  /** Pilihan pembimbing dari mahasiswa, urut prioritas (id dosen). */
  pilihanPembimbing: string[]
  /** Pembimbing yang ditetapkan (id dosen). */
  pembimbing: string[]
  status: StatusTugasAkhir
  riwayat: RiwayatAlur[]
  /** Perubahan judul/pembimbing tidak langsung mengubah data: menunggu persetujuan. */
  perubahan: PermintaanPerubahan[]
}

export interface Dosen {
  id: string
  nama: string
  bidang: string[]
  /** Kuota bimbingan dosen ini; bawaan dari konfigurasi prodi. */
  kuota?: number
  terisi: number
  /** Kanal kontak resmi (mis. "via MY UNPAM"). Tidak diisi dengan alamat karangan. */
  kontak?: string
}

export interface RingkasanTA {
  tugasAkhir: TugasAkhir | null
  dosen: Dosen[]
  /** Judul yang sudah terdaftar di prodi, untuk peringatan kemiripan. */
  judulTerdaftar: string[]
}

export interface Bimbingan {
  id: string
  tugasAkhirId: string
  /** Tanggal pertemuan (ISO). */
  tanggal: string
  /** Bab/bagian yang dibahas. */
  bagian: string
  /** Ringkasan arahan dosen (diisi mahasiswa, diverifikasi dosen). */
  ringkasan: string
  tugasBerikutnya?: { teks: string; tenggat?: string }
  /** Nomor versi draf yang dibahas (lihat VersiDraf). */
  versiDraf?: number
  /** Hanya entri DISETUJUI yang sah dan dihitung sebagai syarat ujian. */
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanDosen?: string
  diverifikasi?: { oleh: string; waktu: string }
}

/** Versi draf naskah. Tidak pernah ditimpa: setiap unggahan = versi baru dengan hash SHA-256. */
export interface VersiDraf {
  versi: number
  nama: string
  ukuran: number
  tipe: string
  sha256: string
  catatan: string
  diunggah: string
}

export interface Logbook {
  tugasAkhirId: string
  entri: Bimbingan[]
  versi: VersiDraf[]
}

export type JenisUjianAkhir = (typeof JENIS_UJIAN_AKHIR)[number]
export type StatusPendaftaran = 'DRAF' | 'MENUNGGU_PEMBIMBING' | 'DIVERIFIKASI_PRODI' | 'TERJADWAL' | 'DIBATALKAN'

export interface BerkasUjian {
  /** Id aturan berkas (AturanBerkas.id). */
  id: string
  nama: string
  ukuran: number
  tipe: string
  sha256: string
  diunggah: string
  status: 'DIUNGGAH' | 'DIVERIFIKASI' | 'DITOLAK'
  alasan?: string
}

export interface RiwayatPendaftaran {
  dari: StatusPendaftaran
  ke: StatusPendaftaran
  aksi: string
  pelaku: PeranAlur
  waktu: string
  catatan?: string
}

export interface PendaftaranUjianAkhir {
  id: string
  tugasAkhirId: string
  jenis: JenisUjianAkhir
  status: StatusPendaftaran
  berkas: BerkasUjian[]
  sesi?: SesiUjian
  riwayat: RiwayatPendaftaran[]
}

/** Slot ujian akhir yang ditawarkan prodi. */
export interface SlotUjian {
  id: string
  jenis: JenisUjianAkhir
  mulai: string
  selesai: string
  ruang: string
  kapasitas: number
  terisi: number
  penguji: string[]
}

export interface SkorKriteria {
  kriteriaId: string
  nilai: number
}

export interface Penilaian {
  pengujiId: string
  skor: SkorKriteria[]
  rekomendasi: 'LULUS' | 'LULUS_REVISI' | 'TIDAK_LULUS'
  dikirim?: string
}

export type JenisUjianSemester = (typeof JENIS_UJIAN_SEMESTER)[number]

/** Jadwal ujian semester milik pemegang sesi untuk satu jenis ujian. */
export interface JadwalUjianSemester {
  jenis: JenisUjianSemester
  semester: string
  /** ID kartu ujian (isi QR). Verifikasi di server; tidak memuat NIM/nama. */
  kartuId: string
  sesi: SesiUjian[]
}

export interface LampiranBukti {
  nama: string
  ukuran: number
  tipe: string
}

export interface PengajuanUjian {
  id: string
  jenis: 'SUSULAN' | 'REMEDIAL'
  kodeMK: string
  namaMK: string
  alasan: string
  lampiran: LampiranBukti[]
  status: 'DIAJUKAN' | 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK'
  diajukan: string
  catatan?: string
}

export interface Revisi {
  id: string
  bagian: string
  permintaan: string
  pengujiId: string
  tenggat?: string
  status: 'BELUM' | 'DIKERJAKAN' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK'
}
