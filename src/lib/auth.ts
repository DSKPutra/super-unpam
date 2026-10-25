import type { User } from './types'

/**
 * Lapisan auth SSO.
 * TODO(LPTI): ganti mode demo dengan OIDC (oidc-client-ts) ke IdP SATU UNPAM:
 *   authority:    https://satu.unpam.ac.id/<TODO>
 *   client_id:    <TODO>
 *   redirect_uri: <origin>/callback
 *   scope:        openid profile email offline_access
 * Token disimpan di memori + refresh token via cookie HttpOnly dari BFF — bukan localStorage.
 */
export const SSO_CONFIGURED = false

export const DEMO_USER: User = {
  name: 'DEA SAKA KURNIA PUTRA',
  nim: '2026-DEMO-0001',
  role: 'MAHASISWA',
  prodi: 'Teknik Informatika',
  fakultas: 'Fakultas Ilmu Komputer',
  angkatan: '2023',
}

export function startSsoLogin() {
  // TODO(LPTI): userManager.signinRedirect()
  window.location.href = 'https://satu.unpam.ac.id'
}
