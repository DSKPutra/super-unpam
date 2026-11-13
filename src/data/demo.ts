// Data contoh. TODO(LPTI): ganti dengan panggilan BFF (/api/...) — struktur dibuat mirip respons API.
// Halaman TIDAK mengimpor file ini langsung: aksesnya lewat src/lib/api.ts (mode demo) atau
// konektor mock di /api/_connectors (mode BFF), sehingga UI tidak berubah saat sumber data diganti.
import type {
  AppNotification,
  AttendanceRecap,
  Bill,
  CampusEvent,
  JadwalTes,
  RingkasanSertifikasi,
  RingkasanToefl,
  KrsClass,
  NewsFeed,
  OnlineClass,
  Ranking,
  ScheduleItem,
  SemesterGrades,
  Task,
  User,
} from '../lib/types.js'
import type { Dosen, JadwalUjianSemester, Logbook, PengajuanUjian, ProfilKelayakan, SesiUjian, SlotUjian, TugasAkhir } from '../lib/akademik/types.js'

export const DEMO_USER: User = {
  name: 'DEA SAKA KURNIA PUTRA',
  nim: '231011400001',
  role: 'MAHASISWA',
  prodi: 'Teknik Informatika',
  fakultas: 'Fakultas Ilmu Komputer',
  angkatan: '2023',
}

export const schedule: ScheduleItem[] = [
  { day: 'Senin', time: '08:00–10:30', code: 'TIF301', name: 'Pemrograman Web', room: 'Gedung A · 402', lecturer: 'Dr. Andi Wijaya, M.Kom' },
  { day: 'Senin', time: '13:00–15:30', code: 'TIF305', name: 'Kecerdasan Buatan', room: 'Lab Komputer 3', lecturer: 'Rina Kartika, M.T.' },
  { day: 'Selasa', time: '10:30–13:00', code: 'TIF303', name: 'Basis Data Lanjut', room: 'Gedung B · 305', lecturer: 'Budi Santoso, M.Kom' },
  { day: 'Rabu', time: '08:00–10:30', code: 'TIF307', name: 'Rekayasa Perangkat Lunak', room: 'Gedung A · 210', lecturer: 'Siti Rahma, M.Cs' },
  { day: 'Kamis', time: '15:30–18:00', code: 'TIF309', name: 'Jaringan Komputer', room: 'Lab Jaringan', lecturer: 'Hendra Gunawan, M.T.' },
  { day: 'Jumat', time: '13:30–16:00', code: 'UNV201', name: 'Bahasa Inggris Akademik', room: 'Gedung C · 101', lecturer: 'Maya Lestari, M.Pd' },
]

export const grades: SemesterGrades[] = [
  {
    semester: 'Semester 4 (Genap 2025/2026)',
    ips: 3.72,
    courses: [
      { code: 'TIF202', name: 'Struktur Data', sks: 3, grade: 'A' },
      { code: 'TIF204', name: 'Sistem Operasi', sks: 3, grade: 'A-' },
      { code: 'TIF206', name: 'Pemrograman Berorientasi Objek', sks: 3, grade: 'A' },
      { code: 'TIF208', name: 'Statistika', sks: 2, grade: 'B+' },
      { code: 'UNV202', name: 'Pancasila', sks: 2, grade: 'A' },
    ],
  },
  {
    semester: 'Semester 3 (Ganjil 2025/2026)',
    ips: 3.6,
    courses: [
      { code: 'TIF201', name: 'Algoritma Pemrograman', sks: 3, grade: 'A' },
      { code: 'TIF203', name: 'Matematika Diskrit', sks: 3, grade: 'B+' },
      { code: 'TIF205', name: 'Arsitektur Komputer', sks: 3, grade: 'A-' },
      { code: 'UNV201', name: 'Kewarganegaraan', sks: 2, grade: 'A' },
    ],
  },
]

export const krsOffer: KrsClass[] = [
  { code: 'TIF301', name: 'Pemrograman Web', sks: 3, class: '05TPLE001', quota: 40, filled: 34 },
  { code: 'TIF303', name: 'Basis Data Lanjut', sks: 3, class: '05TPLE001', quota: 40, filled: 40 },
  { code: 'TIF305', name: 'Kecerdasan Buatan', sks: 3, class: '05TPLE002', quota: 35, filled: 21 },
  { code: 'TIF307', name: 'Rekayasa Perangkat Lunak', sks: 3, class: '05TPLE001', quota: 40, filled: 38 },
  { code: 'TIF309', name: 'Jaringan Komputer', sks: 3, class: '05TPLE003', quota: 30, filled: 12 },
  { code: 'TIF311', name: 'Interaksi Manusia & Komputer', sks: 2, class: '05TPLE001', quota: 40, filled: 29 },
  { code: 'UNV201', name: 'Bahasa Inggris Akademik', sks: 2, class: '05TPLE004', quota: 45, filled: 30 },
]

export const classes: OnlineClass[] = [
  { code: 'TIF301', name: 'Pemrograman Web', progress: 62, materials: 9, color: '#0b4ea2' },
  { code: 'TIF303', name: 'Basis Data Lanjut', progress: 55, materials: 8, color: '#7c3aed' },
  { code: 'TIF305', name: 'Kecerdasan Buatan', progress: 48, materials: 7, color: '#ea580c' },
  { code: 'TIF307', name: 'Rekayasa Perangkat Lunak', progress: 70, materials: 10, color: '#16a34a' },
  { code: 'TIF309', name: 'Jaringan Komputer', progress: 40, materials: 6, color: '#0891b2' },
]

export const tasks: Task[] = [
  { id: 't1', course: 'Basis Data Lanjut', title: 'Laporan Praktikum Normalisasi', due: '27 Okt 2026, 23:59', status: 'todo' },
  { id: 't2', course: 'Pemrograman Web', title: 'Project: Landing Page Responsif', due: '30 Okt 2026, 23:59', status: 'todo' },
  { id: 't3', course: 'Kecerdasan Buatan', title: 'Kuis 5: Search Algorithm', due: '28 Okt 2026, 10:00', status: 'todo' },
  { id: 't4', course: 'Rekayasa Perangkat Lunak', title: 'Dokumen SRS Kelompok', due: '5 Nov 2026, 23:59', status: 'todo' },
  { id: 't5', course: 'Jaringan Komputer', title: 'Praktikum Subnetting', due: '20 Okt 2026', status: 'done' },
]

export const bills: Bill[] = [
  { id: 'b1', name: 'UKT / SPP Semester Ganjil 2026/2027 — Cicilan 2', amount: 1625000, due: '10 Nov 2026', status: 'unpaid', va: '8808 2026 0001 0001' },
  { id: 'b2', name: 'Biaya Ujian Akhir Semester', amount: 250000, due: '1 Des 2026', status: 'unpaid', va: '8808 2026 0001 0002' },
  { id: 'b3', name: 'UKT / SPP Semester Ganjil 2026/2027 — Cicilan 1', amount: 1625000, due: '10 Sep 2026', status: 'paid', va: '8808 2026 0001 0000' },
  { id: 'b4', name: 'Tes TOEFL Prediction', amount: 150000, due: '1 Sep 2026', status: 'paid', va: '8808 2026 0001 0099' },
]

export const events: CampusEvent[] = [
  { id: 'e1', title: 'Seminar Nasional Teknologi & AI 2026', date: '2 Nov 2026', place: 'Auditorium Kampus Viktor', quota: 500, registered: 412, sertifikat: true },
  { id: 'e2', title: 'Workshop UI/UX untuk Mahasiswa', date: '9 Nov 2026', place: 'Online (Zoom)', quota: 200, registered: 88, sertifikat: true },
  { id: 'e3', title: 'Job Fair UNPAM 2026', date: '20 Nov 2026', place: 'Gedung Serbaguna', quota: 2000, registered: 1240, sertifikat: false },
  { id: 'e4', title: 'Lomba Inovasi Bisnis Mahasiswa', date: '28 Nov 2026', place: 'Kampus Pusat', quota: 100, registered: 61, sertifikat: true },
]

// — MY LB (contoh)
export const jadwalTes: JadwalTes[] = [
  { id: 'jt-2611-08', jenis: 'TOEFL Prediction', tanggal: '2026-11-08T01:00:00Z', tempat: 'Lab Bahasa · Gedung C', kuota: 40, terisi: 16, biaya: 150000, tutupDaftar: '2026-11-05T16:59:59Z' },
  { id: 'jt-2611-22', jenis: 'TOEFL Prediction', tanggal: '2026-11-22T01:00:00Z', tempat: 'Lab Bahasa · Gedung C', kuota: 40, terisi: 40, biaya: 150000, tutupDaftar: '2026-11-19T16:59:59Z' },
  { id: 'jt-2612-06', jenis: 'TOEFL Prediction', tanggal: '2026-12-06T01:00:00Z', tempat: 'Online (proctoring)', kuota: 60, terisi: 9, biaya: 150000, tutupDaftar: '2026-12-03T16:59:59Z' },
]

export const toefl: RingkasanToefl = {
  target: 500,
  hasil: [
    { id: 'h-2609', tanggal: '2026-09-01T01:00:00Z', skor: 520, listening: 53, structure: 51, reading: 52, berlakuSampai: '2028-09-01T00:00:00Z' },
    { id: 'h-2603', tanggal: '2026-03-14T01:00:00Z', skor: 487, listening: 49, structure: 48, reading: 49, berlakuSampai: '2028-03-14T00:00:00Z' },
  ],
  pendaftaran: [{ id: 'pt-2609', jadwalId: 'jt-2609-01', status: 'selesai', tagihanId: 'b4' }],
}

// — MY LSP (contoh)
export const sertifikasi: RingkasanSertifikasi = {
  skema: [
    { id: 'sk-jwd', nama: 'Junior Web Developer', prodi: ['Teknik Informatika', 'Sistem Informasi'], dibuka: false },
    { id: 'sk-dba', nama: 'Database Administrator (Junior)', prodi: ['Teknik Informatika', 'Sistem Informasi'], dibuka: true, tutupDaftar: '2026-11-30T16:59:59Z', biaya: 350000 },
    { id: 'sk-net', nama: 'Network Administrator Muda', prodi: ['Teknik Informatika'], dibuka: false },
    { id: 'sk-akt', nama: 'Teknisi Akuntansi Junior', prodi: ['Akuntansi'], dibuka: true, tutupDaftar: '2026-11-30T16:59:59Z', biaya: 350000 },
  ],
  ujian: [
    { id: 'uk-jwd', skemaId: 'sk-jwd', tanggal: '2026-11-15T01:00:00Z', tempat: 'TUK Gedung A · Lab 2', status: 'terjadwal' },
    { id: 'uk-net', skemaId: 'sk-net', tanggal: '2026-06-05T01:00:00Z', tempat: 'TUK Gedung A · Lab 4', status: 'kompeten' },
  ],
  sertifikat: [{ id: 'sert-net', skemaId: 'sk-net', nomor: 'CONTOH-NET-2026-0001', terbit: '2026-06-12T00:00:00Z', berlakuSampai: '2029-06-12T00:00:00Z' }],
}

export const ranking: Ranking = {
  prodiRank: 12,
  prodiTotal: 438,
  points: 860,
  achievements: [
    { title: 'Juara 2 Hackathon Kampus 2026', level: 'Universitas', points: 300 },
    { title: 'Finalis Gemastik XIX — Pengembangan Aplikasi', level: 'Nasional', points: 400 },
    { title: 'Asisten Laboratorium Basis Data', level: 'Prodi', points: 160 },
  ],
}

// Berita CONTOH untuk mode demo saja; selalu ditampilkan dengan label "Contoh" (lihat BeritaSection).
export const news: NewsFeed = {
  source: 'contoh',
  fetchedAt: '2026-10-24T08:00:00.000Z',
  items: [
    { id: 'n1', tag: 'Akademik', title: 'Jadwal UTS Ganjil 2026/2027 telah terbit', summary: '', date: '2026-10-24T02:00:00.000Z', url: 'https://unpam.ac.id/' },
    { id: 'n2', tag: 'Beasiswa', title: 'Pendaftaran Beasiswa Prestasi UNPAM dibuka hingga 15 November', summary: '', date: '2026-10-22T02:00:00.000Z', url: 'https://unpam.ac.id/' },
    { id: 'n3', tag: 'Kampus', title: 'Perpustakaan buka hingga pukul 21.00 selama masa UTS', summary: '', date: '2026-10-20T02:00:00.000Z', url: 'https://unpam.ac.id/' },
  ],
}

export const notifications: AppNotification[] = [
  { id: 1, src: 'Keuangan', text: 'Cicilan 2 UKT jatuh tempo 10 November 2026.', time: '1 jam lalu', read: false },
  { id: 2, src: 'Kuliah', text: 'Tugas baru: Laporan Praktikum Normalisasi (Basis Data Lanjut).', time: '3 jam lalu', read: false },
  { id: 3, src: 'Prestasi', text: 'Poin prestasi Anda bertambah 400 (Gemastik XIX).', time: 'Kemarin', read: false },
  { id: 4, src: 'Event', text: 'Pendaftaran Seminar Nasional Teknologi & AI berhasil.', time: '2 hari lalu', read: true },
]

export const attendanceRecap: AttendanceRecap[] = [
  { name: 'Pemrograman Web', hadir: 7, total: 8 },
  { name: 'Basis Data Lanjut', hadir: 8, total: 8 },
  { name: 'Kecerdasan Buatan', hadir: 6, total: 8 },
  { name: 'Rekayasa Perangkat Lunak', hadir: 8, total: 8 },
  { name: 'Jaringan Komputer', hadir: 5, total: 8 },
]

// TODO(LPTI): koordinat & radius resmi tiap kampus. Nilai ini PERKIRAAN untuk demo, bukan data resmi.
// Di mode BFF koordinat hanya ada di server (api/_lib/config.ts) dan tidak pernah dikirim ke klien.
export const demoGeofences = [
  { name: 'Kampus Pusat Pamulang', lat: -6.3437, lng: 106.739, radius: 300 },
  { name: 'Kampus Viktor', lat: -6.3478, lng: 106.6893, radius: 300 },
]

// — Exam Center (contoh). Waktu WIB ditulis dengan zona +07:00.
const wib = (s: string) => new Date(`${s}:00+07:00`).toISOString()
const sesiUjian = (jenis: JadwalUjianSemester['jenis'], kode: string, nama: string, tgl: string, mulai: string, selesai: string, ruang: string, kursi: string, extra: Partial<SesiUjian> = {}): SesiUjian => ({
  id: `${jenis.toLowerCase()}-${kode}`,
  jenis,
  kode,
  nama,
  mulai: wib(`${tgl}T${mulai}`),
  selesai: wib(`${tgl}T${selesai}`),
  ruang,
  kursi,
  petugas: ['Pengawas contoh'],
  ...extra,
})

export const ujianSemester: Record<JadwalUjianSemester['jenis'], JadwalUjianSemester> = {
  UTS: {
    jenis: 'UTS',
    semester: 'Ganjil 2026/2027',
    kartuId: 'KU-2026-GJ-7F3A9C21',
    sesi: [
      sesiUjian('UTS', 'TIF301', 'Pemrograman Web', '2026-11-16', '08:00', '09:40', 'Gedung A · 402', 'A-17'),
      sesiUjian('UTS', 'TIF303', 'Basis Data Lanjut', '2026-11-17', '10:00', '11:40', 'Gedung B · 305', 'C-04', {
        sebelumnya: { mulai: wib('2026-11-17T08:00'), selesai: wib('2026-11-17T09:40'), ruang: 'Gedung B · 301' },
      }),
      sesiUjian('UTS', 'TIF309', 'Jaringan Komputer', '2026-11-17', '12:00', '13:40', 'Gedung B · 305', 'C-11'),
      sesiUjian('UTS', 'TIF305', 'Kecerdasan Buatan', '2026-11-18', '13:00', '14:40', 'Lab Komputer 3', 'PC-22'),
      sesiUjian('UTS', 'TIF307', 'Rekayasa Perangkat Lunak', '2026-11-18', '14:00', '15:40', 'Gedung A · 404', 'B-09'),
    ],
  },
  UAS: {
    jenis: 'UAS',
    semester: 'Ganjil 2026/2027',
    kartuId: 'KU-2026-GJ-UAS-91B2E4D0',
    sesi: [
      sesiUjian('UAS', 'TIF301', 'Pemrograman Web', '2027-01-11', '08:00', '09:40', 'Gedung A · 402', 'A-05'),
      sesiUjian('UAS', 'TIF303', 'Basis Data Lanjut', '2027-01-12', '08:00', '09:40', 'Gedung B · 305', 'C-12'),
      sesiUjian('UAS', 'TIF305', 'Kecerdasan Buatan', '2027-01-13', '10:00', '11:40', 'Lab Komputer 3', 'PC-07'),
    ],
  },
  SUSULAN: { jenis: 'SUSULAN', semester: 'Ganjil 2026/2027', kartuId: 'KU-2026-GJ-SUS-00000000', sesi: [] },
  REMEDIAL: { jenis: 'REMEDIAL', semester: 'Ganjil 2026/2027', kartuId: 'KU-2026-GJ-REM-00000000', sesi: [] },
}

export const profilKelayakan: ProfilKelayakan = {
  prodi: 'Teknik Informatika',
  kehadiran: { TIF301: 92, TIF303: 81, TIF305: 68, TIF307: 88, TIF309: 79 },
  keuanganLunas: true,
  sks: 112,
  ipk: 3.67,
  bimbinganDisetujui: 0,
  persetujuanPembimbing: false,
  berkas: [],
  mkLulus: [],
}

export const pengajuanUjian: PengajuanUjian[] = [
  {
    id: 'pj-2604-01',
    jenis: 'SUSULAN',
    kodeMK: 'TIF204',
    namaMK: 'Sistem Operasi',
    alasan: 'Sakit (contoh)',
    lampiran: [{ nama: 'surat-keterangan.pdf', ukuran: 182_000, tipe: 'application/pdf' }],
    status: 'DISETUJUI',
    diajukan: '2026-04-20T02:00:00.000Z',
  },
]

// — Skripsi/Tugas Akhir (contoh). Nama dosen sama dengan data jadwal contoh; bukan orang sungguhan.
export const dosenPembimbing: Dosen[] = [
  { id: 'dsn-andi', nama: 'Dr. Andi Wijaya, M.Kom', bidang: ['Rekayasa Perangkat Lunak', 'Sistem Informasi'], terisi: 7, kontak: 'via MY UNPAM (contoh)' },
  { id: 'dsn-rina', nama: 'Rina Kartika, M.T.', bidang: ['Kecerdasan Buatan & Data'], terisi: 4, kontak: 'via MY UNPAM (contoh)' },
  { id: 'dsn-budi', nama: 'Budi Santoso, M.Kom', bidang: ['Sistem Informasi', 'Rekayasa Perangkat Lunak'], terisi: 10, kontak: 'via MY UNPAM (contoh)' },
  { id: 'dsn-siti', nama: 'Siti Rahma, M.Cs', bidang: ['Rekayasa Perangkat Lunak', 'Multimedia & Gim'], terisi: 2, kontak: 'via MY UNPAM (contoh)' },
  { id: 'dsn-hadi', nama: 'Hadi Pratama, M.Kom', bidang: ['Jaringan & Keamanan'], kuota: 8, terisi: 5, kontak: 'via MY UNPAM (contoh)' },
]

export const judulTerdaftar: string[] = [
  'Sistem Rekomendasi Buku Perpustakaan Berbasis Collaborative Filtering',
  'Deteksi Intrusi Jaringan Menggunakan Random Forest',
  'Aplikasi Presensi Mahasiswa Berbasis QR Code Dinamis',
  'Prediksi Kelulusan Mahasiswa dengan Regresi Logistik',
  'Gamifikasi Pembelajaran Algoritma untuk Mahasiswa Baru',
]

/** Antrean pengajuan judul untuk tampilan dosen (contoh). */
export const antrianJudul: TugasAkhir[] = [
  {
    id: 'ta-contoh-1',
    judul: 'Klasifikasi Sentimen Ulasan Aplikasi Kampus dengan IndoBERT',
    abstrak: 'Penelitian ini mengklasifikasikan sentimen ulasan pengguna aplikasi kampus memakai model bahasa IndoBERT (contoh).',
    bidang: 'Kecerdasan Buatan & Data',
    metode: 'Pengumpulan data ulasan, anotasi, fine-tuning, evaluasi F1 (contoh).',
    pilihanPembimbing: ['dsn-rina', 'dsn-andi', 'dsn-siti'],
    pembimbing: [],
    status: 'DIAJUKAN',
    riwayat: [{ dari: 'DRAF_JUDUL', ke: 'DIAJUKAN', peristiwa: 'AJUKAN_JUDUL', pelaku: 'MAHASISWA', waktu: '2026-10-21T03:00:00.000Z' }],
    perubahan: [],
  },
]

/** Mahasiswa bimbingan contoh (untuk tampilan dosen T04). */
export const taBimbinganContoh: TugasAkhir = {
  id: 'ta-contoh-2',
  judul: 'Optimasi Rute Pengantaran Kantin Kampus dengan Algoritma Genetika',
  abstrak: 'Contoh tugas akhir untuk tampilan dosen.',
  bidang: 'Kecerdasan Buatan & Data',
  metode: 'Contoh.',
  pilihanPembimbing: ['dsn-rina'],
  pembimbing: ['dsn-rina'],
  status: 'BIMBINGAN',
  riwayat: [
    { dari: 'DRAF_JUDUL', ke: 'DIAJUKAN', peristiwa: 'AJUKAN_JUDUL', pelaku: 'MAHASISWA', waktu: '2026-08-04T03:00:00.000Z' },
    { dari: 'DIAJUKAN', ke: 'DISETUJUI_PEMBIMBING', peristiwa: 'SETUJUI_JUDUL', pelaku: 'DOSEN', waktu: '2026-08-11T03:00:00.000Z' },
    { dari: 'DISETUJUI_PEMBIMBING', ke: 'BIMBINGAN', peristiwa: 'MULAI_BIMBINGAN', pelaku: 'MAHASISWA', waktu: '2026-08-12T03:00:00.000Z' },
  ],
  perubahan: [],
}

export const logbookContoh: Logbook = {
  tugasAkhirId: 'ta-contoh-2',
  entri: [
    { id: 'bb-1', tugasAkhirId: 'ta-contoh-2', tanggal: '2026-08-20T03:00:00.000Z', bagian: 'Bab 1 Pendahuluan', ringkasan: 'Perjelas latar belakang dan batasan masalah (contoh).', status: 'DISETUJUI', diverifikasi: { oleh: 'dsn-rina', waktu: '2026-08-21T03:00:00.000Z' } },
    { id: 'bb-2', tugasAkhirId: 'ta-contoh-2', tanggal: '2026-09-17T03:00:00.000Z', bagian: 'Bab 2 Tinjauan Pustaka', ringkasan: 'Tambahkan penelitian terkait lima tahun terakhir (contoh).', status: 'MENUNGGU', versiDraf: 1 },
  ],
  versi: [{ versi: 1, nama: 'draf-bab1-2.pdf', ukuran: 412_000, tipe: 'application/pdf', sha256: 'c0ffee'.repeat(10) + 'c0ff', catatan: 'Draf awal bab 1–2 (contoh)', diunggah: '2026-09-16T03:00:00.000Z' }],
}

// — Slot ujian akhir yang ditawarkan prodi (contoh). Beberapa sengaja penuh/bentrok untuk peragaan.
const slotUjian = (id: string, jenis: SlotUjian['jenis'], tgl: string, mulai: string, selesai: string, ruang: string, kapasitas: number, terisi: number, penguji: string[]): SlotUjian => ({
  id, jenis, mulai: wib(`${tgl}T${mulai}`), selesai: wib(`${tgl}T${selesai}`), ruang, kapasitas, terisi, penguji,
})
export const slotUjianAkhir: SlotUjian[] = [
  slotUjian('sp-1124', 'PROPOSAL', '2026-11-24', '09:00', '11:00', 'R. Sidang 1', 4, 1, ['dsn-andi', 'dsn-hadi']),
  slotUjian('sp-1116', 'PROPOSAL', '2026-11-16', '08:30', '10:30', 'R. Sidang 2', 4, 0, ['dsn-rina', 'dsn-siti']),
  slotUjian('sp-1125', 'PROPOSAL', '2026-11-25', '13:00', '15:00', 'R. Sidang 1', 4, 4, ['dsn-andi', 'dsn-budi']),
  slotUjian('sp-1126', 'PROPOSAL', '2026-11-26', '09:00', '11:00', 'R. Sidang 3', 4, 2, ['dsn-budi', 'dsn-rina']),
  slotUjian('ss-0118', 'SIDANG', '2027-01-18', '09:00', '11:00', 'R. Sidang 1', 3, 0, ['dsn-andi', 'dsn-hadi', 'dsn-rina']),
  slotUjian('sh-0111', 'SEMINAR_HASIL', '2027-01-11', '13:00', '15:00', 'R. Sidang 2', 4, 1, ['dsn-siti', 'dsn-budi']),
  slotUjian('su-0114', 'UAPS', '2027-01-14', '09:00', '11:00', 'R. Sidang 3', 4, 0, ['dsn-hadi', 'dsn-siti']),
]

/** Jadwal lain para penguji (contoh) untuk deteksi bentrok penguji. */
export const jadwalPenguji: SesiUjian[] = [
  { id: 'pg-budi-1126', jenis: 'SIDANG', kode: 'lain', nama: 'Sidang mahasiswa lain', mulai: wib('2026-11-26T08:00'), selesai: wib('2026-11-26T10:00'), ruang: 'R. Sidang 1', petugas: ['dsn-budi'] },
]

/** Jadwal yudisium (contoh). TODO(BAAK): dari server. */
export const jadwalYudisium = { jadwal: new Date('2027-02-15T02:00:00.000Z').toISOString(), tempat: 'Auditorium Kampus Viktor (contoh)' }
