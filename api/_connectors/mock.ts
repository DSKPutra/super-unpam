import * as demo from '../../src/data/demo.js'
import type { Role, User } from '../../src/lib/types.js'
import { isProduction } from '../_lib/config.js'
import { ServiceUnavailableError } from '../_lib/http.js'
import type { DataPenilaian, PendaftaranUjianAkhir } from '../../src/lib/akademik/types.js'
import type { Connectors } from './types.js'

// Implementasi mock: memakai data contoh yang sama dengan mode demo klien (src/data/demo.ts).
// Akun demo per peran untuk menguji BFF: username berawalan "dosen", "tendik", atau "alumni"
// masuk sebagai peran tersebut; selainnya mahasiswa. Sandi apa pun ≥ 6 karakter diterima.
// Nama/NIDN di bawah adalah data contoh, bukan orang sungguhan.

const ACCOUNTS: Record<Role, User> = {
  MAHASISWA: demo.DEMO_USER,
  DOSEN: { name: 'AKUN DEMO DOSEN', nim: '0400000001', role: 'DOSEN', prodi: 'Teknik Informatika', fakultas: 'Fakultas Ilmu Komputer', angkatan: '-' },
  TENDIK: { name: 'AKUN DEMO TENDIK', nim: 'T000000001', role: 'TENDIK', prodi: 'Biro Akademik', fakultas: 'Rektorat', angkatan: '-' },
  ALUMNI: { name: 'AKUN DEMO ALUMNI', nim: '191011400001', role: 'ALUMNI', prodi: 'Teknik Informatika', fakultas: 'Fakultas Ilmu Komputer', angkatan: '2019' },
}

const roleFor = (username: string): Role => {
  const u = username.trim().toLowerCase()
  return u.startsWith('dosen') ? 'DOSEN' : u.startsWith('tendik') ? 'TENDIK' : u.startsWith('alumni') ? 'ALUMNI' : 'MAHASISWA'
}

const ok = <T>(v: T) => Promise.resolve(v)
const taMock = new Map([...demo.antrianJudul, demo.taBimbinganContoh].map((t) => [t.id, t]))
const lbMock = new Map([[demo.logbookContoh.tugasAkhirId, demo.logbookContoh]])
const pdMock = new Map<string, PendaftaranUjianAkhir>()
const slotTerisi = new Map<string, number>()
const nilaiMock = new Map<string, DataPenilaian>()
const taPemilik = new Map<string, string>([...demo.antrianJudul, demo.taBimbinganContoh].map((t) => [t.id, 'mahasiswa-contoh']))

export const mock: Connectors = {
  sso: {
    async authenticate(username, password) {
      // Login mock menerima sandi apa pun: jangan pernah aktif di production tanpa disengaja.
      if (isProduction() && process.env.ALLOW_MOCK_LOGIN_IN_PRODUCTION !== 'true')
        throw new ServiceUnavailableError('Login kampus belum tersambung (konektor SSO masih mock).')
      await new Promise((r) => setTimeout(r, 300))
      return username.trim() && password.length >= 6 ? ACCOUNTS[roleFor(username)] : null
    },
    getUser: (sub) => ok(Object.values(ACCOUNTS).find((u) => u.nim === sub) ?? null),
  },
  myUnpam: {
    getSchedule: () => ok(demo.schedule),
    getGrades: () => ok(demo.grades),
    getKrsOffer: () => ok(demo.krsOffer),
    getAttendanceRecap: () => ok(demo.attendanceRecap),
    recordAttendance: () => ok(undefined),
    getUjian: (_sub, jenis) => ok(demo.ujianSemester[jenis]),
    getProfilKelayakan: () => ok(demo.profilKelayakan),
    getPengajuanUjian: () => ok(demo.pengajuanUjian),
    // Mock: tidak menyimpan; mengembalikan bentuk respons yang sama dengan sistem asli.
    ajukanUjian: (_sub, input) => ok({ ...input, id: `pj-${Date.now().toString(36)}`, status: 'DIAJUKAN' as const, diajukan: new Date().toISOString() }),
    // Tugas akhir: disimpan di memori instance function saja (data contoh, hilang saat instance berganti).
    getRingkasanTA: (sub) => ok({ tugasAkhir: [...taMock.values()].find((t) => taPemilik.get(t.id) === sub) ?? null, dosen: demo.dosenPembimbing, judulTerdaftar: demo.judulTerdaftar }),
    getAntrianTA: () => ok([...taMock.values()].filter((t) => t.status === 'DIAJUKAN')),
    getTA: (id) => ok(taMock.get(id) ?? null),
    simpanTA: (sub, ta) => {
      if (!taPemilik.has(ta.id)) taPemilik.set(ta.id, sub)
      taMock.set(ta.id, ta)
      return ok(ta)
    },
    getLogbook: (taId) => ok(lbMock.get(taId) ?? { tugasAkhirId: taId, entri: [], versi: [] }),
    simpanLogbook: (lb) => (lbMock.set(lb.tugasAkhirId, lb), ok(lb)),
    // TODO(BFF-AUTHZ): saring berdasarkan dosen pembimbing sungguhan.
    getTABimbingan: () => ok([...taMock.values()].filter((t) => t.pembimbing.length > 0)),
    getPendaftaranUjian: (taId) => ok([...pdMock.values()].filter((p) => p.tugasAkhirId === taId)),
    getPendaftaranById: (id) => ok(pdMock.get(id) ?? null),
    simpanPendaftaranUjian: (p, ubah = {}) => {
      for (const [k, v] of Object.entries(ubah)) slotTerisi.set(k, (slotTerisi.get(k) ?? 0) + v)
      pdMock.set(p.id, p)
      return ok(p)
    },
    // TODO(BFF-AUTHZ): saring berdasarkan dosen pembimbing sungguhan.
    getAntrianUjianAkhir: () => ok([...pdMock.values()].filter((p) => p.status === 'MENUNGGU_PEMBIMBING')),
    getSlotUjian: () => ok(demo.slotUjianAkhir.map((x) => ({ ...x, terisi: x.terisi + (slotTerisi.get(x.id) ?? 0) }))),
    getJadwalPenguji: () => ok(demo.jadwalPenguji),
    getPendaftaranTerjadwal: () => ok([...pdMock.values()].filter((p) => p.status === 'TERJADWAL' || p.status === 'SELESAI')),
    getPenilaian: (pid) => ok(nilaiMock.get(pid) ?? null),
    simpanPenilaian: (d) => (nilaiMock.set(d.pendaftaranId, d), ok(d)),
  },
  mentari: { getClasses: () => ok(demo.classes), getTasks: () => ok(demo.tasks) },
  siskemu: { getBills: () => ok(demo.bills) },
  ems: { getEvents: () => ok(demo.events) },
  myLsp: {
    getRingkasan: () => ok(demo.sertifikasi),
    // Mock: tidak menyimpan apa pun; hanya mengembalikan bentuk respons yang sama dengan sistem asli.
    daftarSkema: (_sub, skemaId) => ok({ id: `uk-${skemaId}`, skemaId, status: 'terdaftar' as const }),
  },
  myLb: {
    getJadwal: () => ok(demo.jadwalTes),
    getRingkasan: () => ok(demo.toefl),
    daftarTes: (_sub, jadwalId) => ok({ id: `pt-${jadwalId}`, jadwalId, status: 'menunggu-bayar' as const }),
  },
  sispema: { getRanking: () => ok(demo.ranking) },
  portal: { getNotifications: () => ok(demo.notifications) },
}
