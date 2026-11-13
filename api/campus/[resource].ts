import { connectors } from '../_connectors/index.js'
import { readEndpoint } from '../_lib/endpoint.js'

// GET /api/campus/{events,certifications,toefl,ranking,notifications}
// sumber: EMS, MY LSP, MY LB, SISPEMA, portal pengumuman
export const GET = readEndpoint({
  events: { load: (s) => connectors.ems.getEvents(s.sub) },
  certifications: { roles: ['MAHASISWA', 'ALUMNI'], load: (s) => connectors.myLsp.getCertifications(s.sub) },
  toefl: { roles: ['MAHASISWA', 'ALUMNI'], load: (s) => connectors.myLb.getToefl(s.sub) },
  ranking: { roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], load: (s) => connectors.sispema.getRanking(s.sub) },
  notifications: { load: (s) => connectors.portal.getNotifications(s.sub) },
})
