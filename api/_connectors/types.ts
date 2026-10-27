import type {
  AppNotification,
  AttendanceRecap,
  Bill,
  CampusEvent,
  Certification,
  KrsClass,
  NewsItem,
  OnlineClass,
  Ranking,
  ScheduleItem,
  SemesterGrades,
  Task,
  ToeflSummary,
  User,
} from '../../src/lib/types'

// Satu antarmuka per sistem sumber kampus (kolom `source` di src/data/features.ts).
// Setiap sistem punya implementasi `mock` (data contoh) dan `http` (sistem asli), dengan bentuk yang sama.
// `sub` = NIM/NIDN pemegang sesi; konektor hanya mengembalikan data milik `sub`.

/** SSO / direktori akun kampus. */
export interface SsoConnector {
  /** null bila kredensial salah (jangan bedakan "akun tidak ada" dan "sandi salah"). */
  authenticate(username: string, password: string): Promise<User | null>
  getUser(sub: string): Promise<User | null>
}

/** MY UNPAM: akademik & presensi. */
export interface MyUnpamConnector {
  getSchedule(sub: string): Promise<ScheduleItem[]>
  getGrades(sub: string): Promise<SemesterGrades[]>
  getKrsOffer(sub: string): Promise<KrsClass[]>
  getAttendanceRecap(sub: string): Promise<AttendanceRecap[]>
  recordAttendance(sub: string, course: string, method: 'qr' | 'kode' | 'gps'): Promise<void>
}

/** MENTARI: kelas online & tugas. */
export interface MentariConnector {
  getClasses(sub: string): Promise<OnlineClass[]>
  getTasks(sub: string): Promise<Task[]>
}

/** SISKEMU: keuangan. Nominal rupiah bilangan bulat; perhitungan uang hanya di sistem sumber. */
export interface SiskemuConnector {
  getBills(sub: string): Promise<Bill[]>
}

/** EMS: event kampus. */
export interface EmsConnector {
  getEvents(sub: string): Promise<CampusEvent[]>
}

/** MY LSP: sertifikasi kompetensi. */
export interface MyLspConnector {
  getCertifications(sub: string): Promise<Certification[]>
}

/** MY LB: lembaga bahasa / TOEFL. */
export interface MyLbConnector {
  getToefl(sub: string): Promise<ToeflSummary>
}

/** SISPEMA: prestasi & poin. */
export interface SispemaConnector {
  getRanking(sub: string): Promise<Ranking>
}

/** Pengumuman & notifikasi kampus. TODO(LPTI): sistem sumber belum ditentukan. */
export interface PortalConnector {
  getNews(): Promise<NewsItem[]>
  getNotifications(sub: string): Promise<AppNotification[]>
}

export interface Connectors {
  sso: SsoConnector
  myUnpam: MyUnpamConnector
  mentari: MentariConnector
  siskemu: SiskemuConnector
  ems: EmsConnector
  myLsp: MyLspConnector
  myLb: MyLbConnector
  sispema: SispemaConnector
  portal: PortalConnector
}
