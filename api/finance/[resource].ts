import { connectors } from '../_connectors/index.js'
import { readEndpoint } from '../_lib/endpoint.js'

// GET /api/finance/bills — sumber: SISKEMU
export const GET = readEndpoint({
  bills: { roles: ['MAHASISWA'], load: (s) => connectors.siskemu.getBills(s.sub) },
})
