import type { Role } from '../lib/types'

// Semua fitur dirender DI DALAM Super UNPAM (satu aplikasi), bukan membuka situs lain.
// `source` = sistem backend kampus yang nanti dipanggil lewat BFF (bukan ditampilkan ke user).
export interface Feature {
  id: string
  name: string
  icon: string
  color: string
  route: string
  roles: Role[]
  keywords: string[]
  source: string
}

const ALL: Role[] = ['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI']

export const FEATURES: Feature[] = [
  { id: 'ktm', name: 'KTM Digital', icon: '🪪', color: '#0a3f83', route: 'ktm', roles: ALL, keywords: ['kartu', 'qr', 'identitas', 'ktm'], source: 'SSO' },
  { id: 'presensi', name: 'Presensi', icon: '📍', color: '#db2777', route: 'presensi', roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], keywords: ['absen', 'qr', 'kehadiran'], source: 'MY UNPAM' },
  { id: 'jadwal', name: 'Jadwal', icon: '🗓️', color: '#0b4ea2', route: 'akademik/jadwal', roles: ['MAHASISWA', 'DOSEN'], keywords: ['kuliah', 'kelas', 'ruang'], source: 'MY UNPAM' },
  { id: 'krs', name: 'KRS', icon: '📝', color: '#2563eb', route: 'akademik/krs', roles: ['MAHASISWA'], keywords: ['rencana studi', 'mata kuliah', 'registrasi'], source: 'MY UNPAM' },
  { id: 'nilai', name: 'Nilai & KHS', icon: '📊', color: '#7c3aed', route: 'akademik/nilai', roles: ['MAHASISWA'], keywords: ['khs', 'ipk', 'ips', 'transkrip'], source: 'MY UNPAM' },
  { id: 'kelas', name: 'Kelas Online', icon: '💻', color: '#f59e0b', route: 'kuliah', roles: ['MAHASISWA', 'DOSEN'], keywords: ['mentari', 'elearning', 'materi', 'lms'], source: 'MENTARI' },
  { id: 'tugas', name: 'Tugas', icon: '✅', color: '#ea580c', route: 'kuliah/tugas', roles: ['MAHASISWA', 'DOSEN'], keywords: ['mentari', 'kuis', 'deadline'], source: 'MENTARI' },
  { id: 'bayar', name: 'Pembayaran', icon: '💳', color: '#16a34a', route: 'keuangan', roles: ['MAHASISWA'], keywords: ['ukt', 'spp', 'tagihan', 'virtual account', 'va'], source: 'SISKEMU' },
  { id: 'event', name: 'Event', icon: '🎤', color: '#0891b2', route: 'event', roles: ALL, keywords: ['ems', 'seminar', 'pkkmb', 'workshop'], source: 'EMS' },
  { id: 'sertifikasi', name: 'Sertifikasi', icon: '📜', color: '#059669', route: 'sertifikasi', roles: ['MAHASISWA', 'ALUMNI'], keywords: ['lsp', 'kompetensi', 'skema'], source: 'MY LSP' },
  { id: 'toefl', name: 'TOEFL', icon: '🗣️', color: '#c026d3', route: 'toefl', roles: ['MAHASISWA', 'ALUMNI'], keywords: ['lembaga bahasa', 'my lb', 'inggris'], source: 'MY LB' },
  { id: 'prestasi', name: 'Prestasi', icon: '🏆', color: '#ca8a04', route: 'prestasi', roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], keywords: ['sispema', 'peringkat', 'poin'], source: 'SISPEMA' },
  { id: 'tracer', name: 'Tracer Study', icon: '🧭', color: '#475569', route: 'tracer', roles: ['ALUMNI', 'TENDIK'], keywords: ['alumni', 'survei', 'karier'], source: 'TRACER STUDY' },
  { id: 'kerjasama', name: 'Kerjasama', icon: '🤝', color: '#0d9488', route: 'kerjasama', roles: ['DOSEN', 'TENDIK'], keywords: ['siskerma', 'mou', 'moa', 'ia'], source: 'SISKERMA' },
]
