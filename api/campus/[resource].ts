import { connectors } from '../_connectors'
import { readEndpoint } from '../_lib/endpoint'

// GET /api/campus/{events,certifications,toefl,ranking,news,notifications}
// sumber: EMS, MY LSP, MY LB, SISPEMA, portal pengumuman
export const GET = readEndpoint({
  events: { load: (s) => connectors.ems.getEvents(s.sub) },
  certifications: { roles: ['MAHASISWA', 'ALUMNI'], load: (s) => connectors.myLsp.getCertifications(s.sub) },
  toefl: { roles: ['MAHASISWA', 'ALUMNI'], load: (s) => connectors.myLb.getToefl(s.sub) },
  ranking: { roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], load: (s) => connectors.sispema.getRanking(s.sub) },
  news: { load: () => connectors.portal.getNews() },
  notifications: { load: (s) => connectors.portal.getNotifications(s.sub) },
})
