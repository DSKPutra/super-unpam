import { connectors } from '../_connectors'
import { readEndpoint } from '../_lib/endpoint'

// GET /api/kuliah/{classes,tasks} — sumber: MENTARI
export const GET = readEndpoint({
  classes: { load: (s) => connectors.mentari.getClasses(s.sub) },
  tasks: { load: (s) => connectors.mentari.getTasks(s.sub) },
})
