import { connectors } from '../_connectors'
import { readEndpoint } from '../_lib/endpoint'

// GET /api/academic/{schedule,grades,krs,attendance} — sumber: MY UNPAM
export const GET = readEndpoint({
  schedule: { load: (s) => connectors.myUnpam.getSchedule(s.sub) },
  grades: { roles: ['MAHASISWA'], load: (s) => connectors.myUnpam.getGrades(s.sub) },
  krs: { roles: ['MAHASISWA'], load: (s) => connectors.myUnpam.getKrsOffer(s.sub) },
  attendance: { roles: ['MAHASISWA', 'TENDIK'], load: (s) => connectors.myUnpam.getAttendanceRecap(s.sub) },
})
