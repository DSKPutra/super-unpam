import type { Role } from '../../src/lib/types'
import { handle, HttpError, json, lastSegment } from './http'
import { requireSession, type Session } from './session'

export interface ReadRoute {
  /** Peran yang boleh membaca; kosong = semua pengguna yang masuk. Data selalu milik pemegang sesi. */
  roles?: readonly Role[]
  load: (session: Session) => Promise<unknown>
}

/** Endpoint GET /api/<domain>/<resource>: verifikasi sesi + peran, lalu ambil data dari konektor. */
export function readEndpoint(routes: Record<string, ReadRoute>) {
  return handle(async (req) => {
    const name = lastSegment(req)
    const route = Object.hasOwn(routes, name) ? routes[name] : undefined
    if (!route) throw new HttpError(404, 'Sumber data tidak ditemukan.')
    return json(await route.load(requireSession(req, route.roles)))
  })
}
