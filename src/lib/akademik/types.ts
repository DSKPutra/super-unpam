// Tipe domain ujian & skripsi/tugas akhir. Murni TypeScript (tanpa React/DOM) agar bisa dipakai
// bersama oleh klien, BFF (/api), dan tes. Semua angka aturan berasal dari AturanAkademik (konfigurasi),
// bukan dari kode.

export type JenisUjianSemester = 'UTS' | 'UAS' | 'SUSULAN' | 'REMEDIAL'
export type JenisUjianAkhir = 'PROPOSAL' | 'SEMINAR_HASIL' | 'UAPS' | 'SIDANG'
export type JenisUjian = JenisUjianSemester | JenisUjianAkhir

/** Asal sebuah aturan. `dokumen: null` = belum diverifikasi manusia → TODO(BAAK). */
export interface SumberAturan {
  dokumen: string | null
  halaman?: string
  /** Tanggal verifikasi (YYYY-MM-DD) oleh manusia; null bila belum. */
  diverifikasi: string | null
  catatan?: string
}

export interface AturanBerkas {
  id: string
  nama: string
  /** MIME yang diterima, mis. 'application/pdf'. */
  tipe: string[]
  maksMB: number
  wajib: boolean
  contoh?: string
}

export interface AturanUjianAkhir {
  /** Nama tampilan. "UAPS" sengaja dikonfigurasi, artinya belum diketahui (lihat docs). */
  nama: string
  keterangan?: string
  aktif: boolean
  minBimbingan: number
  butuhPersetujuanPembimbing: boolean
  butuhLunas: boolean
  /** Biaya ujian (rupiah) bila ada; null = tidak ada / belum diketahui. */
  biaya: number | null
  berkas: AturanBerkas[]
  jumlahPenguji: number
  pengujiBolehPembimbing: boolean
  durasiMenit: number
  /** Lembar penilaian hanya terbuka di jendela ini relatif terhadap sesi ujian. */
  jendelaPenilaian: { sebelumMenit: number; sesudahMenit: number }
  /** Pembatalan/penjadwalan ulang diizinkan sampai H-n. */
  batasBatalHari: number
  tataTertib: string[]
}

export interface KriteriaRubrik {
  id: string
  nama: string
  /** Persen; total seharusnya 100 (divalidasi). */
  bobot: number
  min: number
  max: number
}

export interface HurufMutu {
  /** Batas bawah inklusif pada skala 0–100. */
  min: number
  huruf: string
}

export interface AturanAkademik {
  id: string
  /** '*' = berlaku umum; atau nama prodi persis seperti di User.prodi. */
  prodi: string
  sumber: SumberAturan
  ujianSemester: {
    minKehadiranPersen: number
    wajibLunas: boolean
    /** Jarak minimum antar ujian berurutan sebelum diberi peringatan "beruntun". */
    jedaBeruntunMenit: number
    /** Pengajuan susulan/remedial paling lambat n hari setelah ujian. */
    batasPengajuanSusulanHari: number
    tataTertib: Record<JenisUjianSemester, string[]>
  }
  skripsi: {
    minSks: number
    minIpk: number
    mkWajib: { kode: string; nama: string }[]
    maksJudulKarakter: number
    jumlahPilihanPembimbing: number
    kuotaPembimbingDefault: number
    /** Pengingat halus bila tidak ada bimbingan lebih dari n hari. */
    jedaPengingatHari: number
    ambangKemiripanJudul: number
    maksDrafMB: number
  }
  ujianAkhir: Record<JenisUjianAkhir, AturanUjianAkhir>
  penilaian: {
    rubrik: KriteriaRubrik[]
    desimal: number
    /** Selisih nilai antar penguji (skala 0–100) yang memicu rapat kesepakatan. */
    ambangSelisihPenguji: number
    hurufMutu: HurufMutu[]
  }
  revisi: { batasHari: number }
  kelulusan: {
    checklist: { id: string; nama: string; rute: string }[]
    opsiPublikasi: { id: string; nama: string }[]
    maksNaskahMB: number
  }
}

// — Ujian semester —

export interface SesiUjian {
  id: string
  jenis: JenisUjian
  kodeMk?: string
  judul: string
  /** ISO 8601 dengan offset +07:00 (WIB). */
  mulai: string
  selesai: string
  ruang: string
  kursi?: string
  pengawas?: string[]
  penguji?: string[]
  /** NIM/NIDN yang terlibat (untuk deteksi bentrok per orang). */
  peserta: string[]
  /** Jadwal sebelumnya bila berubah (untuk penanda "Berubah"). */
  sebelumnya?: { mulai: string; selesai: string; ruang: string }
}

export interface Ujian {
  id: string
  jenis: JenisUjianSemester
  semester: string
  sesi: SesiUjian
  /** ID kartu (bukan NIM mentah) untuk QR; diverifikasi server. */
  idKartu: string
}

/** Data mahasiswa yang dibutuhkan untuk evaluasi kelayakan. Berasal dari server. */
export interface ProfilAkademik {
  nim: string
  prodi: string
  sks: number
  ipk: number
  mkLulus: string[]
  /** Persen kehadiran per kode MK. */
  kehadiran: Record<string, number>
  tagihanLunas: boolean
  bimbinganDisetujui: number
  persetujuanPembimbing: boolean
  berkasTerverifikasi: string[]
}

export interface Syarat {
  id: string
  label: string
  terpenuhi: boolean
  /** Kalimat yang bisa ditindaklanjuti, mis. "Kehadiran 68%, minimal 75%". */
  alasan: string
  /** Rute aplikasi untuk memperbaiki (mis. 'keuangan'). */
  tautanPerbaikan?: string
}

export interface HasilKelayakan {
  layak: boolean
  syarat: Syarat[]
}

// — Skripsi / tugas akhir —

export type StatusTA =
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

export type JenisPeristiwa =
  | 'AJUKAN'
  | 'SETUJUI_PEMBIMBING'
  | 'TOLAK'
  | 'AJUKAN_ULANG'
  | 'MULAI_BIMBINGAN'
  | 'NYATAKAN_LAYAK_PROPOSAL'
  | 'JADWALKAN_UJIAN'
  | 'LULUS'
  | 'LULUS_DENGAN_REVISI'
  | 'TIDAK_LULUS'
  | 'REVISI_DISETUJUI'
  | 'NYATAKAN_LAYAK_AKHIR'
  | 'SELESAIKAN'

export interface Peristiwa {
  jenis: JenisPeristiwa
  /** Nama/peran pelaku. */
  oleh: string
  /** ISO WIB. */
  pada: string
  catatan?: string
  /** Wajib untuk TOLAK dan TIDAK_LULUS. */
  alasan?: string
}

export interface RiwayatAlur {
  dari: StatusTA
  ke: StatusTA
  peristiwa: Peristiwa
}

export interface Pembimbing {
  nidn: string
  nama: string
  email: string
  urutan: 1 | 2
}

export interface TugasAkhir {
  id: string
  nim: string
  judul: string
  abstrak: string
  bidang: string
  metode: string
  pilihanPembimbing: string[]
  pembimbing: Pembimbing[]
  status: StatusTA
  riwayat: RiwayatAlur[]
}

export type StatusEntri = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'

export interface Bimbingan {
  id: string
  tanggal: string
  bab: string
  ringkasan: string
  tugasBerikutnya: string
  tenggatTugas?: string
  lampiranVersi?: number
  status: StatusEntri
  catatanDosen?: string
}

export interface VersiDraf {
  versi: number
  nama: string
  ukuran: number
  sha256: string
  diunggah: string
  catatan: string
}

export type StatusBerkas = 'BELUM' | 'DIUNGGAH' | 'DIVERIFIKASI' | 'DITOLAK'

export interface BerkasPendaftaran {
  idAturan: string
  status: StatusBerkas
  nama?: string
  sha256?: string
  alasanTolak?: string
}

export interface PendaftaranUjianAkhir {
  id: string
  jenis: JenisUjianAkhir
  status: 'DRAF' | 'MENUNGGU_PEMBIMBING' | 'MENUNGGU_PRODI' | 'TERJADWAL' | 'DIBATALKAN' | 'SELESAI'
  berkas: BerkasPendaftaran[]
  sesi?: SesiUjian
}

export interface SkorKriteria {
  kriteria: string
  nilai: number
  catatan?: string
}

export interface Penilaian {
  penguji: string
  skor: SkorKriteria[]
  rekomendasi: 'LULUS' | 'LULUS_DENGAN_REVISI' | 'TIDAK_LULUS'
  dikirim: string | null
}

export type StatusRevisi = 'BELUM' | 'DIKERJAKAN' | 'DIAJUKAN' | 'DISETUJUI' | 'DITOLAK'

export interface Revisi {
  id: string
  bagian: string
  permintaan: string
  penguji: string
  tenggat: string
  status: StatusRevisi
}
