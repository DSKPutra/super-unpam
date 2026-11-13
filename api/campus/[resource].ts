import { connectors } from '../_connectors/index.js'
import { beritaGET } from '../_lib/berita-feed.js'
import { readEndpoint } from '../_lib/endpoint.js'
import { lastSegment } from '../_lib/http.js'

// GET /api/campus/{events,ranking,notifications} (butuh sesi)
// GET /api/campus/berita = /api/berita (publik, lewat rewrite di vercel.json)
// sumber: EMS, MY LSP, MY LB, SISPEMA, portal pengumuman, situs resmi UNPAM
const baca = readEndpoint({
  events: { load: (s) => connectors.ems.getEvents(s.sub) },
  ranking: { roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], load: (s) => connectors.sispema.getRanking(s.sub) },
  notifications: { load: (s) => connectors.portal.getNotifications(s.sub) },
})

export const GET = (req: Request) => (lastSegment(req) === 'berita' ? beritaGET(req) : baca(req))
