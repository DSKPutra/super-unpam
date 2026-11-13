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
import type { DataPenilaian, Finalisasi, JadwalUjianSemester, JenisUjianSemester, Logbook, PendaftaranUjianAkhir, PengajuanUjian, ProfilKelayakan, RingkasanTA, SesiUjian, SlotUjian, TugasAkhir } from '../../src/lib/akademik/types.js'

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
  getRingkasanTA(sub: string): Promise<RingkasanTA>
  /** Pengajuan judul yang menunggu keputusan dosen pemegang sesi. */
  getAntrianTA(sub: string): Promise<TugasAkhir[]>
  getTA(id: string): Promise<TugasAkhir | null>
  /** Menyimpan hasil transisi yang SUDAH divalidasi mesin alur di BFF. */
  simpanTA(sub: string, ta: TugasAkhir): Promise<TugasAkhir>
  getLogbook(taId: string): Promise<Logbook>
  simpanLogbook(lb: Logbook): Promise<Logbook>
  /** Tugas akhir bimbingan dosen pemegang sesi. */
  getTABimbingan(sub: string): Promise<TugasAkhir[]>
  getPendaftaranUjian(taId: string): Promise<PendaftaranUjianAkhir[]>
  getPendaftaranById(id: string): Promise<PendaftaranUjianAkhir | null>
  simpanPendaftaranUjian(p: PendaftaranUjianAkhir, ubahTerisi?: Record<string, number>): Promise<PendaftaranUjianAkhir>
  /** Pendaftaran yang menunggu persetujuan pembimbing (dosen pemegang sesi). */
  getAntrianUjianAkhir(sub: string): Promise<PendaftaranUjianAkhir[]>
  getSlotUjian(): Promise<SlotUjian[]>
  getJadwalPenguji(): Promise<SesiUjian[]>
  /** Pendaftaran terjadwal atau selesai (berita acara tetap dibutuhkan setelah rilis). */
  getPendaftaranTerjadwal(): Promise<PendaftaranUjianAkhir[]>
  getPenilaian(pendaftaranId: string): Promise<DataPenilaian | null>
  simpanPenilaian(d: DataPenilaian): Promise<DataPenilaian>
  getFinalisasi(taId: string): Promise<Finalisasi | null>
  simpanFinalisasi(f: Finalisasi): Promise<Finalisasi>
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
