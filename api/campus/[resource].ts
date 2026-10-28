import { connectors } from '../_connectors/index.js'
import { readEndpoint } from '../_lib/endpoint.js'

// GET /api/campus/{events,ranking,notifications}
// sumber: EMS, MY LSP, MY LB, SISPEMA, portal pengumuman
export const GET = readEndpoint({
  events: { load: (s) => connectors.ems.getEvents(s.sub) },
  ranking: { roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], load: (s) => connectors.sispema.getRanking(s.sub) },
  notifications: { load: (s) => connectors.portal.getNotifications(s.sub) },
})
