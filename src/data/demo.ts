// Data contoh. TODO(LPTI): ganti dengan panggilan BFF (/api/...) — struktur dibuat mirip respons API.

export const schedule = [
  { day: 'Senin', time: '08:00–10:30', code: 'TIF301', name: 'Pemrograman Web', room: 'Gedung A · 402', lecturer: 'Dr. Andi Wijaya, M.Kom' },
  { day: 'Senin', time: '13:00–15:30', code: 'TIF305', name: 'Kecerdasan Buatan', room: 'Lab Komputer 3', lecturer: 'Rina Kartika, M.T.' },
  { day: 'Selasa', time: '10:30–13:00', code: 'TIF303', name: 'Basis Data Lanjut', room: 'Gedung B · 305', lecturer: 'Budi Santoso, M.Kom' },
  { day: 'Rabu', time: '08:00–10:30', code: 'TIF307', name: 'Rekayasa Perangkat Lunak', room: 'Gedung A · 210', lecturer: 'Siti Rahma, M.Cs' },
  { day: 'Kamis', time: '15:30–18:00', code: 'TIF309', name: 'Jaringan Komputer', room: 'Lab Jaringan', lecturer: 'Hendra Gunawan, M.T.' },
  { day: 'Jumat', time: '13:30–16:00', code: 'UNV201', name: 'Bahasa Inggris Akademik', room: 'Gedung C · 101', lecturer: 'Maya Lestari, M.Pd' },
]

export const grades = [
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

export const krsOffer = [
  { code: 'TIF301', name: 'Pemrograman Web', sks: 3, class: '05TPLE001', quota: 40, filled: 34 },
  { code: 'TIF303', name: 'Basis Data Lanjut', sks: 3, class: '05TPLE001', quota: 40, filled: 40 },
  { code: 'TIF305', name: 'Kecerdasan Buatan', sks: 3, class: '05TPLE002', quota: 35, filled: 21 },
  { code: 'TIF307', name: 'Rekayasa Perangkat Lunak', sks: 3, class: '05TPLE001', quota: 40, filled: 38 },
  { code: 'TIF309', name: 'Jaringan Komputer', sks: 3, class: '05TPLE003', quota: 30, filled: 12 },
  { code: 'TIF311', name: 'Interaksi Manusia & Komputer', sks: 2, class: '05TPLE001', quota: 40, filled: 29 },
  { code: 'UNV201', name: 'Bahasa Inggris Akademik', sks: 2, class: '05TPLE004', quota: 45, filled: 30 },
]

export const classes = [
  { code: 'TIF301', name: 'Pemrograman Web', progress: 62, materials: 9, color: '#0b4ea2' },
  { code: 'TIF303', name: 'Basis Data Lanjut', progress: 55, materials: 8, color: '#7c3aed' },
  { code: 'TIF305', name: 'Kecerdasan Buatan', progress: 48, materials: 7, color: '#ea580c' },
  { code: 'TIF307', name: 'Rekayasa Perangkat Lunak', progress: 70, materials: 10, color: '#16a34a' },
  { code: 'TIF309', name: 'Jaringan Komputer', progress: 40, materials: 6, color: '#0891b2' },
]

export const tasks = [
  { id: 't1', course: 'Basis Data Lanjut', title: 'Laporan Praktikum Normalisasi', due: '27 Okt 2026, 23:59', status: 'todo' },
  { id: 't2', course: 'Pemrograman Web', title: 'Project: Landing Page Responsif', due: '30 Okt 2026, 23:59', status: 'todo' },
  { id: 't3', course: 'Kecerdasan Buatan', title: 'Kuis 5: Search Algorithm', due: '28 Okt 2026, 10:00', status: 'todo' },
  { id: 't4', course: 'Rekayasa Perangkat Lunak', title: 'Dokumen SRS Kelompok', due: '5 Nov 2026, 23:59', status: 'todo' },
  { id: 't5', course: 'Jaringan Komputer', title: 'Praktikum Subnetting', due: '20 Okt 2026', status: 'done' },
]

export const bills = [
  { id: 'b1', name: 'UKT / SPP Semester Ganjil 2026/2027 — Cicilan 2', amount: 1625000, due: '10 Nov 2026', status: 'unpaid' as const, va: '8808 2026 0001 0001' },
  { id: 'b2', name: 'Biaya Ujian Akhir Semester', amount: 250000, due: '1 Des 2026', status: 'unpaid' as const, va: '8808 2026 0001 0002' },
  { id: 'b3', name: 'UKT / SPP Semester Ganjil 2026/2027 — Cicilan 1', amount: 1625000, due: '10 Sep 2026', status: 'paid' as const, va: '8808 2026 0001 0000' },
  { id: 'b4', name: 'Tes TOEFL Prediction', amount: 150000, due: '1 Sep 2026', status: 'paid' as const, va: '8808 2026 0001 0099' },
]

export const events = [
  { id: 'e1', title: 'Seminar Nasional Teknologi & AI 2026', date: '2 Nov 2026', place: 'Auditorium Kampus Viktor', quota: 500, registered: 412, sertifikat: true },
  { id: 'e2', title: 'Workshop UI/UX untuk Mahasiswa', date: '9 Nov 2026', place: 'Online (Zoom)', quota: 200, registered: 88, sertifikat: true },
  { id: 'e3', title: 'Job Fair UNPAM 2026', date: '20 Nov 2026', place: 'Gedung Serbaguna', quota: 2000, registered: 1240, sertifikat: false },
  { id: 'e4', title: 'Lomba Inovasi Bisnis Mahasiswa', date: '28 Nov 2026', place: 'Kampus Pusat', quota: 100, registered: 61, sertifikat: true },
]

export const certifications = [
  { id: 'c1', scheme: 'Junior Web Developer', status: 'Terjadwal', date: 'Uji kompetensi: 15 Nov 2026', progress: 75 },
  { id: 'c2', scheme: 'Database Administrator (Junior)', status: 'Pendaftaran dibuka', date: 'Tutup: 30 Nov 2026', progress: 0 },
  { id: 'c3', scheme: 'Network Administrator Muda', status: 'Kompeten', date: 'Terbit: 12 Jun 2026', progress: 100 },
]

export const toefl = {
  best: 520,
  target: 500,
  history: [
    { date: '1 Sep 2026', score: 520, listening: 53, structure: 51, reading: 52 },
    { date: '14 Mar 2026', score: 487, listening: 49, structure: 48, reading: 49 },
  ],
  next: { date: '8 Nov 2026', place: 'Lab Bahasa · Gedung C', seats: 24 },
}

export const ranking = {
  prodiRank: 12,
  prodiTotal: 438,
  points: 860,
  achievements: [
    { title: 'Juara 2 Hackathon Kampus 2026', level: 'Universitas', points: 300 },
    { title: 'Finalis Gemastik XIX — Pengembangan Aplikasi', level: 'Nasional', points: 400 },
    { title: 'Asisten Laboratorium Basis Data', level: 'Prodi', points: 160 },
  ],
}

export const news = [
  { id: 'n1', tag: 'Akademik', title: 'Jadwal UTS Ganjil 2026/2027 telah terbit', date: '24 Okt 2026' },
  { id: 'n2', tag: 'Beasiswa', title: 'Pendaftaran Beasiswa Prestasi UNPAM dibuka hingga 15 November', date: '22 Okt 2026' },
  { id: 'n3', tag: 'Kampus', title: 'Perpustakaan buka hingga pukul 21.00 selama masa UTS', date: '20 Okt 2026' },
]

export const notifications = [
  { id: 1, src: 'Keuangan', text: 'Cicilan 2 UKT jatuh tempo 10 November 2026.', time: '1 jam lalu', read: false },
  { id: 2, src: 'Kuliah', text: 'Tugas baru: Laporan Praktikum Normalisasi (Basis Data Lanjut).', time: '3 jam lalu', read: false },
  { id: 3, src: 'Prestasi', text: 'Poin prestasi Anda bertambah 400 (Gemastik XIX).', time: 'Kemarin', read: false },
  { id: 4, src: 'Event', text: 'Pendaftaran Seminar Nasional Teknologi & AI berhasil.', time: '2 hari lalu', read: true },
]

export const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
