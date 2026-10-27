import * as demo from '../../src/data/demo'
import type { Role, User } from '../../src/lib/types'
import { isProduction } from '../_lib/config'
import { ServiceUnavailableError } from '../_lib/http'
import type { Connectors } from './types'

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
  },
  mentari: { getClasses: () => ok(demo.classes), getTasks: () => ok(demo.tasks) },
  siskemu: { getBills: () => ok(demo.bills) },
  ems: { getEvents: () => ok(demo.events) },
  myLsp: { getCertifications: () => ok(demo.certifications) },
  myLb: { getToefl: () => ok(demo.toefl) },
  sispema: { getRanking: () => ok(demo.ranking) },
  portal: { getNews: () => ok(demo.news), getNotifications: () => ok(demo.notifications) },
}
