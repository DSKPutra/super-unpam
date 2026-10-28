import { ServiceUnavailableError } from '../_lib/http.js'
import type { Connectors } from './types.js'

// Implementasi http untuk sistem asli kampus. SENGAJA belum diisi: URL, metode autentikasi,
// format respons, dan batas laju tiap sistem belum diketahui dan tidak boleh ditebak.
// Daftar pertanyaan untuk tim LPTI ada di docs/KONEKTOR.md. Kredensial sistem sumber nanti
// dibaca dari environment variable server (mis. MY_UNPAM_BASE_URL, MY_UNPAM_CLIENT_SECRET).

const pending = (system: string) => () =>
  Promise.reject(new ServiceUnavailableError(`Konektor ${system} belum tersambung ke sistem kampus. Lihat docs/KONEKTOR.md.`))

export const http: Connectors = {
  sso: { authenticate: pending('SSO'), getUser: pending('SSO') },
  myUnpam: {
    getSchedule: pending('MY UNPAM'),
    getGrades: pending('MY UNPAM'),
    getKrsOffer: pending('MY UNPAM'),
    getAttendanceRecap: pending('MY UNPAM'),
    recordAttendance: pending('MY UNPAM'),
  },
  mentari: { getClasses: pending('MENTARI'), getTasks: pending('MENTARI') },
  siskemu: { getBills: pending('SISKEMU') },
  ems: { getEvents: pending('EMS') },
  myLsp: { getCertifications: pending('MY LSP') },
  myLb: { getToefl: pending('MY LB') },
  sispema: { getRanking: pending('SISPEMA') },
  portal: { getNews: pending('PORTAL'), getNotifications: pending('PORTAL') },
}
