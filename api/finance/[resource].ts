import { connectors } from '../_connectors'
import { readEndpoint } from '../_lib/endpoint'

// GET /api/finance/bills — sumber: SISKEMU
export const GET = readEndpoint({
  bills: { roles: ['MAHASISWA'], load: (s) => connectors.siskemu.getBills(s.sub) },
})
