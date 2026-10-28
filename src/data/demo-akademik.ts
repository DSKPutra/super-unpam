// Data contoh UJIAN & SKRIPSI/TA. Halaman mengaksesnya lewat src/lib/api.ts, bukan langsung.
// Dimuat sebagai chunk terpisah hanya saat fitur ujian/TA dibuka.
import type { Dosen } from '../lib/akademik/penguji'
import type { Bimbingan, PendaftaranUjianAkhir, ProfilAkademik, Revisi, SesiUjian, TugasAkhir, Ujian, VersiDraf } from '../lib/akademik/types'

const NIM = '231011400001'
const w = (tgl: string, jam: string) => `2026-${tgl}T${jam}:00+07:00`

export const profilAkademik: ProfilAkademik = {
  nim: NIM,
  prodi: 'Teknik Informatika',
  sks: 112,
  ipk: 3.67,
  mkLulus: ['TIF401'],
  // TIF305 sengaja di bawah ambang kehadiran agar keadaan "belum memenuhi syarat" terlihat.
  kehadiran: { TIF301: 88, TIF303: 100, TIF305: 68, TIF307: 94, TIF309: 81 },
  tagihanLunas: true,
  bimbinganDisetujui: 3,
  persetujuanPembimbing: false,
  berkasTerverifikasi: ['lembar-persetujuan'],
}

const s = (id: string, jenis: SesiUjian['jenis'], kodeMk: string, judul: string, tgl: string, mulai: string, selesai: string, ruang: string, kursi: string, extra: Partial<SesiUjian> = {}): SesiUjian => ({
  id,
  jenis,
  kodeMk,
  judul,
  mulai: w(tgl, mulai),
  selesai: w(tgl, selesai),
  ruang,
  kursi,
  pengawas: ['Tim Pengawas Fakultas'],
  peserta: [NIM],
  ...extra,
})

export const ujianSemester: Ujian[] = [
  { id: 'uts-301', jenis: 'UTS', semester: 'Ganjil 2026/2027', idKartu: 'KU-7F3A21', sesi: s('uts-301', 'UTS', 'TIF301', 'Pemrograman Web', '11-16', '08:00', '09:40', 'Gedung A · 402', 'A-17') },
  { id: 'uts-303', jenis: 'UTS', semester: 'Ganjil 2026/2027', idKartu: 'KU-7F3A22', sesi: s('uts-303', 'UTS', 'TIF303', 'Basis Data Lanjut', '11-16', '10:00', '11:40', 'Gedung B · 305', 'C-04') },
  {
    id: 'uts-305',
    jenis: 'UTS',
    semester: 'Ganjil 2026/2027',
    idKartu: 'KU-7F3A23',
    sesi: s('uts-305', 'UTS', 'TIF305', 'Kecerdasan Buatan', '11-17', '13:00', '14:40', 'Lab Komputer 3', 'PC-22', { sebelumnya: { mulai: w('11-17', '08:00'), selesai: w('11-17', '09:40'), ruang: 'Lab Komputer 1' } }),
  },
  { id: 'uts-307', jenis: 'UTS', semester: 'Ganjil 2026/2027', idKartu: 'KU-7F3A24', sesi: s('uts-307', 'UTS', 'TIF307', 'Rekayasa Perangkat Lunak', '11-18', '08:00', '09:40', 'Gedung A · 210', 'B-09') },
  // Bentrok dengan TIF307 (contoh data jadwal yang perlu dilaporkan).
  { id: 'uts-309', jenis: 'UTS', semester: 'Ganjil 2026/2027', idKartu: 'KU-7F3A25', sesi: s('uts-309', 'UTS', 'TIF309', 'Jaringan Komputer', '11-18', '09:00', '10:40', 'Lab Jaringan', 'J-03') },
  { id: 'uas-301', jenis: 'UAS', semester: 'Ganjil 2026/2027', idKartu: 'KU-8B1C01', sesi: s('uas-301', 'UAS', 'TIF301', 'Pemrograman Web', '01-11', '08:00', '09:40', 'Gedung A · 402', 'A-17', { mulai: '2027-01-11T08:00:00+07:00', selesai: '2027-01-11T09:40:00+07:00' }) },
  { id: 'uas-303', jenis: 'UAS', semester: 'Ganjil 2026/2027', idKartu: 'KU-8B1C02', sesi: s('uas-303', 'UAS', 'TIF303', 'Basis Data Lanjut', '01-12', '10:00', '11:40', 'Gedung B · 305', 'C-04', { mulai: '2027-01-12T10:00:00+07:00', selesai: '2027-01-12T11:40:00+07:00' }) },
]

export const dosen: Dosen[] = [
  { nidn: '0412038801', nama: 'Dr. Andi Wijaya, M.Kom', email: 'andi.wijaya@unpam.ac.id', bidang: ['Rekayasa Perangkat Lunak', 'Web'], beban: 6, kuota: null, kuotaDibuka: true },
  { nidn: '0420078502', nama: 'Rina Kartika, M.T.', email: 'rina.kartika@unpam.ac.id', bidang: ['Kecerdasan Buatan', 'Data'], beban: 10, kuota: null, kuotaDibuka: true },
  { nidn: '0405119003', nama: 'Budi Santoso, M.Kom', email: 'budi.santoso@unpam.ac.id', bidang: ['Basis Data', 'Sistem Informasi'], beban: 4, kuota: 8, kuotaDibuka: true },
  { nidn: '0430018704', nama: 'Siti Rahma, M.Cs', email: 'siti.rahma@unpam.ac.id', bidang: ['Interaksi Manusia-Komputer'], beban: 2, kuota: null, kuotaDibuka: false },
  { nidn: '0415069205', nama: 'Hendra Gunawan, M.T.', email: 'hendra.gunawan@unpam.ac.id', bidang: ['Jaringan', 'Keamanan'], beban: 5, kuota: null, kuotaDibuka: true },
]

/** Judul TA yang sudah terdaftar (untuk peringatan kemiripan; contoh). */
export const judulTerdaftar = [
  'Sistem Rekomendasi Buku Perpustakaan Berbasis Collaborative Filtering',
  'Analisis Sentimen Ulasan Aplikasi Menggunakan Naive Bayes',
  'Rancang Bangun Sistem Presensi Mahasiswa Berbasis QR Code',
  'Implementasi Progressive Web App untuk Layanan Akademik Kampus',
  'Deteksi Serangan DDoS pada Jaringan Kampus Menggunakan Machine Learning',
]

export const tugasAkhir: TugasAkhir = {
  id: 'TA-2026-0117',
  nim: NIM,
  judul: 'Super App Kampus Berbasis Progressive Web App dengan Arsitektur Backend-for-Frontend',
  abstrak: 'Menyatukan layanan digital kampus ke satu aplikasi lintas platform yang ringan dan dapat dipakai offline.',
  bidang: 'Rekayasa Perangkat Lunak',
  metode: 'Design Science Research; evaluasi SUS dan Lighthouse',
  pilihanPembimbing: ['0412038801', '0405119003'],
  pembimbing: [{ nidn: '0412038801', nama: 'Dr. Andi Wijaya, M.Kom', email: 'andi.wijaya@unpam.ac.id', urutan: 1 }],
  status: 'BIMBINGAN',
  riwayat: [
    { dari: 'DRAF_JUDUL', ke: 'DIAJUKAN', peristiwa: { jenis: 'AJUKAN', oleh: 'Mahasiswa', pada: w('08-20', '10:12') } },
    { dari: 'DIAJUKAN', ke: 'DITOLAK', peristiwa: { jenis: 'TOLAK', oleh: 'Kaprodi', pada: w('08-25', '14:00'), alasan: 'Judul awal terlalu luas; fokuskan pada satu masalah.' } },
    { dari: 'DITOLAK', ke: 'DRAF_JUDUL', peristiwa: { jenis: 'AJUKAN_ULANG', oleh: 'Mahasiswa', pada: w('08-26', '09:30') } },
    { dari: 'DRAF_JUDUL', ke: 'DIAJUKAN', peristiwa: { jenis: 'AJUKAN', oleh: 'Mahasiswa', pada: w('08-27', '08:15') } },
    { dari: 'DIAJUKAN', ke: 'DISETUJUI_PEMBIMBING', peristiwa: { jenis: 'SETUJUI_PEMBIMBING', oleh: 'Kaprodi', pada: w('09-02', '11:00'), catatan: 'Pembimbing: Dr. Andi Wijaya' } },
    { dari: 'DISETUJUI_PEMBIMBING', ke: 'BIMBINGAN', peristiwa: { jenis: 'MULAI_BIMBINGAN', oleh: 'Pembimbing', pada: w('09-05', '13:00') } },
  ],
}

export const bimbingan: Bimbingan[] = [
  { id: 'b1', tanggal: w('09-05', '13:00'), bab: 'Bab I', ringkasan: 'Rumusan masalah dipersempit ke layanan akademik.', tugasBerikutnya: 'Perbaiki latar belakang', status: 'DISETUJUI', lampiranVersi: 1 },
  { id: 'b2', tanggal: w('09-19', '13:00'), bab: 'Bab II', ringkasan: 'Tambah kajian PWA dan BFF dari jurnal 5 tahun terakhir.', tugasBerikutnya: 'Lengkapi tinjauan pustaka', status: 'DISETUJUI' },
  { id: 'b3', tanggal: w('10-03', '13:00'), bab: 'Bab III', ringkasan: 'Metode DSR disetujui; rancang instrumen SUS.', tugasBerikutnya: 'Susun instrumen evaluasi', status: 'DISETUJUI', lampiranVersi: 2 },
  { id: 'b4', tanggal: w('10-10', '13:00'), bab: 'Bab III', ringkasan: 'Pembahasan populasi & sampel.', tugasBerikutnya: '-', status: 'DITOLAK', catatanDosen: 'Entri ganda dengan pertemuan 3 Okt.' },
]

export const versiDraf: VersiDraf[] = [
  { versi: 1, nama: 'proposal-bab1.pdf', ukuran: 412_000, sha256: '9f2b5c1e4a7d3f60b8e2c4a1d9f7e3b5c2a8d6f4e1b3c5a7d9e2f4b6c8a1d3e5', diunggah: w('09-04', '21:10'), catatan: 'Draf awal Bab I' },
  { versi: 2, nama: 'proposal-bab1-3.pdf', ukuran: 1_284_000, sha256: '3a7e1c9b5d2f4a6c8e0b2d4f6a8c1e3b5d7f9a2c4e6b8d1f3a5c7e9b2d4f6a8c', diunggah: w('10-02', '22:45'), catatan: 'Bab I–III lengkap' },
]

export const pendaftaranAkhir: PendaftaranUjianAkhir[] = []

export const revisiContoh: Revisi[] = [
  { id: 'r1', bagian: 'Bab 4.2', permintaan: 'Tambahkan tabel hasil uji SUS per responden.', penguji: 'Penguji 1', tenggat: w('12-15', '23:59'), status: 'DIAJUKAN' },
  { id: 'r2', bagian: 'Bab 5', permintaan: 'Perjelas keterbatasan penelitian.', penguji: 'Penguji 2', tenggat: w('12-15', '23:59'), status: 'BELUM' },
]

/** Mahasiswa bimbingan untuk layar DOSEN (demo). */
export const mahasiswaBimbingan = [
  { nim: NIM, nama: 'Dea Saka Kurnia Putra', judul: tugasAkhir.judul, status: 'BIMBINGAN' as const, bimbinganSah: 3, terakhir: w('10-03', '13:00'), menunggu: 0 },
  { nim: '231011400045', nama: 'Rizky Maulana', judul: 'Sistem Antrean Klinik Berbasis Web', status: 'DIAJUKAN' as const, bimbinganSah: 0, terakhir: w('10-21', '09:00'), menunggu: 1 },
  { nim: '231011400088', nama: 'Nur Aisyah', judul: 'Klasifikasi Citra Daun Padi dengan CNN', status: 'REVISI_PROPOSAL' as const, bimbinganSah: 5, terakhir: w('09-01', '10:00'), menunggu: 2 },
  { nim: '231011400102', nama: 'Fajar Nugroho', judul: 'Optimasi Rute Kurir dengan Algoritma Genetika', status: 'PENELITIAN' as const, bimbinganSah: 7, terakhir: w('10-24', '15:00'), menunggu: 0 },
]

/**
 * Ujian akhir yang diuji dosen (demo). Sesi pertama dibuat relatif terhadap "sekarang" agar
 * jendela lembar penilaian terlihat terbuka saat demo; sesi lain di masa depan (lembar tertutup).
 */
export function ujianPengujiDemo(sekarang = Date.now()) {
  const iso = (ms: number) => new Date(ms + 7 * 3600_000).toISOString().replace(/\.\d{3}Z$/, '+07:00')
  return [
    {
      id: 'ua-1',
      jenis: 'PROPOSAL' as const,
      mahasiswa: 'Nur Aisyah',
      nim: '231011400088',
      judul: 'Klasifikasi Citra Daun Padi dengan CNN',
      peran: 'Penguji 1',
      /** Nilai pratinjau penguji lain, ditampilkan hanya setelah semua penguji mengirim. */
      nilaiPengujiLain: 71,
      drafVersi: 3,
      drafHash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
      sesi: { mulai: iso(sekarang - 30 * 60000), selesai: iso(sekarang + 60 * 60000), ruang: 'Ruang Sidang 2' },
    },
    {
      id: 'ua-2',
      jenis: 'SIDANG' as const,
      mahasiswa: 'Fajar Nugroho',
      nim: '231011400102',
      judul: 'Optimasi Rute Kurir dengan Algoritma Genetika',
      peran: 'Penguji 2',
      nilaiPengujiLain: 84,
      drafVersi: 6,
      drafHash: 'aa11bb22cc33dd44ee55ff66aa77bb88cc99dd00ee11ff22aa33bb44cc55dd66',
      sesi: { mulai: '2026-12-03T09:00:00+07:00', selesai: '2026-12-03T11:00:00+07:00', ruang: 'Ruang Sidang 1' },
    },
  ]
}

/** Rekap angkatan per status (agregat, tanpa data pribadi) untuk layar prodi. */
export const rekapAngkatan = { DRAF_JUDUL: 14, DIAJUKAN: 9, BIMBINGAN: 61, UJIAN_PROPOSAL: 6, PENELITIAN: 38, UJIAN_AKHIR: 4, REVISI_AKHIR: 7, YUDISIUM: 11, SELESAI: 23 }
