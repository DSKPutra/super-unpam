import type {
  AppNotification,
  AttendanceRecap,
  Bill,
  CampusEvent,
  JadwalTes,
  PendaftaranTes,
  RingkasanSertifikasi,
  RingkasanToefl,
  UjianKompetensi,
  KrsClass,
  OnlineClass,
  Ranking,
  ScheduleItem,
  SemesterGrades,
  Task,
  User,
} from '../../src/lib/types.js'
import type { JadwalUjianSemester, JenisUjianSemester, PengajuanUjian, ProfilKelayakan } from '../../src/lib/akademik/types.js'

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
  getUjian(sub: string, jenis: JenisUjianSemester): Promise<JadwalUjianSemester>
  getProfilKelayakan(sub: string): Promise<ProfilKelayakan>
  getPengajuanUjian(sub: string): Promise<PengajuanUjian[]>
  ajukanUjian(sub: string, input: Omit<PengajuanUjian, 'id' | 'status' | 'diajukan'>): Promise<PengajuanUjian>
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
  getRingkasan(sub: string): Promise<RingkasanSertifikasi>
  daftarSkema(sub: string, skemaId: string): Promise<UjianKompetensi>
}

/** MY LB: lembaga bahasa / TOEFL. */
export interface MyLbConnector {
  getJadwal(sub: string): Promise<JadwalTes[]>
  getRingkasan(sub: string): Promise<RingkasanToefl>
  daftarTes(sub: string, jadwalId: string): Promise<PendaftaranTes>
}

/** SISPEMA: prestasi & poin. */
export interface SispemaConnector {
  getRanking(sub: string): Promise<Ranking>
}

/** Notifikasi kampus (berita kampus diambil api/berita.ts dari situs resmi). TODO(LPTI): sistem sumber belum ditentukan. */
export interface PortalConnector {
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
