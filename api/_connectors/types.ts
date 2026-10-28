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
} from '../../src/lib/types.js'
import type { Arah, HasilGerbang, InputKendaraan, Kendaraan, LogAkses } from '../../src/lib/parkir.js'
import type { RingkasanParkir } from '../../src/lib/parkir-store.js'

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

/**
 * SARPRAS: parkir kampus & status kartu (KTM). TODO(Sarpras/LPTI): sistem gerbang parkir yang dipakai,
 * cara integrasi palang/kamera plat, dan siapa yang memverifikasi STNK belum ditentukan.
 */
export interface SarprasConnector {
  getRingkasanParkir(sub: string): Promise<RingkasanParkir>
  daftarKendaraan(sub: string, input: InputKendaraan): Promise<Kendaraan>
  hapusKendaraan(sub: string, kendaraanId: string): Promise<void>
  /** NIM/NIDN pemilik kendaraan, atau null bila tidak terdaftar. */
  getPemilikKendaraan(kendaraanId: string): Promise<string | null>
  /** Catat pindaian gerbang; sistem sumber menerapkan anti-passback & kapasitas. */
  catatGerbang(sub: string, kendaraanId: string, arah: Arah, areaId: string): Promise<HasilGerbang>
  isKtmBeku(sub: string): Promise<boolean>
  setKtmBeku(sub: string, beku: boolean): Promise<void>
  getLogKtm(sub: string): Promise<LogAkses[]>
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
  sarpras: SarprasConnector
}
