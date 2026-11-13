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
import type { KirimanJawaban, SesiDaring } from '../../src/lib/akademik/ujian-daring.js'
import type { AgendaDosen } from '../../src/lib/akademik/dosen-prodi.js'
import type { DataPenilaian, Finalisasi, JadwalUjianSemester, JenisUjianAkhir, JenisUjianSemester, Logbook, PendaftaranUjianAkhir, PengajuanUjian, ProfilKelayakan, RingkasanTA, SesiUjian, SlotUjian, TugasAkhir } from '../../src/lib/akademik/types.js'

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
  /** T09 — sesi ujian daring pemegang sesi (dengan soal; BFF menyaringnya sebelum mulai) dan kirimannya. */
  getUjianDaring(sub: string): Promise<SesiDaring[]>
  getKirimanDaring(sub: string, sesiId: string): Promise<KirimanJawaban[]>
  simpanKirimanDaring(sub: string, sesiId: string, daftar: KirimanJawaban[]): Promise<void>
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
  /** T08 — prodi: semua TA di prodi pemegang sesi. */
  getSemuaTA(): Promise<TugasAkhir[]>
  /** T08 — nilai akhir ujian untuk diagregasi di server (tidak pernah dikirim per orang ke papan). */
  getNilaiUjianAkhir(): Promise<{ jenis: JenisUjianAkhir; nilai: number }[]>
  /** T08 — tugas pengawasan UTS/UAS para dosen. */
  getPengawasan(): Promise<SesiUjian[]>
  getJamBimbingan(dosenId: string): Promise<AgendaDosen[]>
  simpanKuota(dosenId: string, k: { kuota: number; tutup: boolean }): Promise<void>
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
