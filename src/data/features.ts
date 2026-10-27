import {
  Award,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Compass,
  CreditCard,
  Handshake,
  IdCard,
  Languages,
  ListChecks,
  MapPin,
  MonitorPlay,
  Mic2,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../lib/types'

// Semua fitur dirender DI DALAM Super UNPAM (satu aplikasi), bukan membuka situs lain.
// `source` = sistem backend kampus yang nanti dipanggil lewat BFF (bukan ditampilkan ke user).
export interface Feature {
  id: string
  name: string
  icon: LucideIcon
  from: string
  to: string
  route: string
  roles: Role[]
  keywords: string[]
  source: string
}

const ALL: Role[] = ['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI']

export const FEATURES: Feature[] = [
  { id: 'ktm', name: 'KTM Digital', icon: IdCard, from: '#4D86FF', to: '#1B3FD1', route: 'ktm', roles: ALL, keywords: ['kartu', 'qr', 'identitas', 'ktm'], source: 'SSO' },
  { id: 'presensi', name: 'Presensi', icon: MapPin, from: '#FF7A93', to: '#E0245E', route: 'presensi', roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], keywords: ['absen', 'qr', 'kehadiran'], source: 'MY UNPAM' },
  { id: 'jadwal', name: 'Jadwal', icon: CalendarDays, from: '#3EE0FF', to: '#0090D4', route: 'akademik/jadwal', roles: ['MAHASISWA', 'DOSEN'], keywords: ['kuliah', 'kelas', 'ruang'], source: 'MY UNPAM' },
  { id: 'krs', name: 'KRS', icon: ClipboardList, from: '#6E9BFF', to: '#2D4FE0', route: 'akademik/krs', roles: ['MAHASISWA'], keywords: ['rencana studi', 'mata kuliah', 'registrasi'], source: 'MY UNPAM' },
  { id: 'nilai', name: 'Nilai & KHS', icon: BarChart3, from: '#A58CFF', to: '#5B3FE0', route: 'akademik/nilai', roles: ['MAHASISWA'], keywords: ['khs', 'ipk', 'ips', 'transkrip'], source: 'MY UNPAM' },
  { id: 'kelas', name: 'Kelas Online', icon: MonitorPlay, from: '#FFC24D', to: '#E07800', route: 'kuliah', roles: ['MAHASISWA', 'DOSEN'], keywords: ['mentari', 'elearning', 'materi', 'lms'], source: 'MENTARI' },
  { id: 'tugas', name: 'Tugas', icon: ListChecks, from: '#FF9B5C', to: '#E0521B', route: 'kuliah/tugas', roles: ['MAHASISWA', 'DOSEN'], keywords: ['mentari', 'kuis', 'deadline'], source: 'MENTARI' },
  { id: 'bayar', name: 'Pembayaran', icon: CreditCard, from: '#3DF5D5', to: '#00A88C', route: 'keuangan', roles: ['MAHASISWA'], keywords: ['ukt', 'spp', 'tagihan', 'virtual account', 'va'], source: 'SISKEMU' },
  { id: 'event', name: 'Event', icon: Mic2, from: '#5CE1FF', to: '#2D6BFF', route: 'event', roles: ALL, keywords: ['ems', 'seminar', 'pkkmb', 'workshop'], source: 'EMS' },
  { id: 'sertifikasi', name: 'Sertifikasi', icon: Award, from: '#5CF2B0', to: '#0E9F6E', route: 'sertifikasi', roles: ['MAHASISWA', 'ALUMNI'], keywords: ['lsp', 'kompetensi', 'skema'], source: 'MY LSP' },
  { id: 'toefl', name: 'TOEFL', icon: Languages, from: '#F08CFF', to: '#A12DE0', route: 'toefl', roles: ['MAHASISWA', 'ALUMNI'], keywords: ['lembaga bahasa', 'my lb', 'inggris'], source: 'MY LB' },
  { id: 'prestasi', name: 'Prestasi', icon: Trophy, from: '#FFD65C', to: '#D99100', route: 'prestasi', roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], keywords: ['sispema', 'peringkat', 'poin'], source: 'SISPEMA' },
  { id: 'tracer', name: 'Tracer Study', icon: Compass, from: '#9FB4D9', to: '#4A5D82', route: 'tracer', roles: ['ALUMNI', 'TENDIK'], keywords: ['alumni', 'survei', 'karier'], source: 'TRACER STUDY' },
  { id: 'kerjasama', name: 'Kerjasama', icon: Handshake, from: '#4DF0E0', to: '#0B8F9F', route: 'kerjasama', roles: ['DOSEN', 'TENDIK'], keywords: ['siskerma', 'mou', 'moa', 'ia'], source: 'SISKERMA' },
]

export const featureById = (id: string) => FEATURES.find((f) => f.id === id)!
