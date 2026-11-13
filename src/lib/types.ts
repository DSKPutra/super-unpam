export type Role = 'MAHASISWA' | 'DOSEN' | 'TENDIK' | 'ALUMNI'

export interface User {
  name: string
  nim: string
  role: Role
  prodi: string
  fakultas: string
  angkatan: string
}

// Tipe domain dipakai bersama oleh klien (src/lib/api.ts) dan BFF (/api) agar bentuk respons selalu sama.

export interface ScheduleItem {
  day: string
  time: string
  code: string
  name: string
  room: string
  lecturer: string
}

export interface CourseGrade {
  code: string
  name: string
  sks: number
  grade: string
}

export interface SemesterGrades {
  semester: string
  ips: number
  courses: CourseGrade[]
}

export interface KrsClass {
  code: string
  name: string
  sks: number
  class: string
  quota: number
  filled: number
}

export interface OnlineClass {
  code: string
  name: string
  progress: number
  materials: number
  color: string
}

export interface Task {
  id: string
  course: string
  title: string
  due: string
  status: 'todo' | 'done'
}

export interface Bill {
  id: string
  name: string
  /** Rupiah, bilangan bulat. */
  amount: number
  due: string
  status: 'unpaid' | 'paid'
  va: string
}

export interface CampusEvent {
  id: string
  title: string
  date: string
  place: string
  quota: number
  registered: number
  sertifikat: boolean
}

export interface Certification {
  id: string
  scheme: string
  status: string
  date: string
  progress: number
}

export interface ToeflSummary {
  best: number
  target: number
  history: { date: string; score: number; listening: number; structure: number; reading: number }[]
  next: { date: string; place: string; seats: number }
}

export interface Ranking {
  prodiRank: number
  prodiTotal: number
  points: number
  achievements: { title: string; level: string; points: number }[]
}

/** Berita kampus yang sudah dinormalisasi BFF (api/berita.ts). Ringkasan selalu teks biasa. */
export interface NewsArticle {
  id: string
  title: string
  summary: string
  /** ISO 8601 */
  date: string
  /** Tautan ke artikel asli (selalu https://…unpam.ac.id). */
  url: string
  tag?: string
}

export interface NewsFeed {
  items: NewsArticle[]
  /** Nama host sumber, mis. "unpam.ac.id". */
  source: string
  /** Waktu server mengambil sumber (ISO). Dipakai untuk label "Terakhir diperbarui". */
  fetchedAt: string
}

export interface AppNotification {
  id: number
  src: string
  text: string
  time: string
  read: boolean
}

export interface AttendanceRecap {
  name: string
  hadir: number
  total: number
}

/** Nama & radius area presensi. Koordinat sengaja tidak dikirim ke klien. */
export interface CampusArea {
  name: string
  radius: number
}

export type QrKind = 'KTM' | 'PRESENSI'

export interface QrToken {
  kind: QrKind
  subject: string
  slot: number
  code: string
  /** Detik tersisa sebelum kode berganti. */
  expiresIn: number
  period: number
}

export type CheckInRequest =
  | { method: 'qr'; payload: string }
  | { method: 'kode'; course: string; code: string }
  | { method: 'gps'; lat: number; lng: number; accuracy?: number }

export interface CheckInResult {
  course: string
  method: string
  time: string
}
