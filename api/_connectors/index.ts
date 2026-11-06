import { http } from './http.js'
import { mock } from './mock.js'
import type { Connectors } from './types.js'

// Pemilihan implementasi per sistem lewat env:
//   CONNECTOR_MODE=mock|http        → bawaan untuk semua sistem (default: mock)
//   CONNECTOR_<SISTEM>=mock|http    → per sistem, mis. CONNECTOR_SSO=http, CONNECTOR_MY_UNPAM=http
// Dengan begitu sistem bisa dipindah ke data asli satu per satu.

const ENV_NAME: Record<keyof Connectors, string> = {
  sso: 'SSO',
  myUnpam: 'MY_UNPAM',
  mentari: 'MENTARI',
  siskemu: 'SISKEMU',
  ems: 'EMS',
  myLsp: 'MY_LSP',
  myLb: 'MY_LB',
  sispema: 'SISPEMA',
  portal: 'PORTAL',
}

/** Mode aktif sebuah konektor. Dipakai endpoint untuk melabeli data mock sebagai "contoh". */
export const connectorMode = (key: keyof Connectors): 'mock' | 'http' =>
  (process.env[`CONNECTOR_${ENV_NAME[key]}`] ?? process.env.CONNECTOR_MODE ?? 'mock') === 'http' ? 'http' : 'mock'

const pick = <K extends keyof Connectors>(key: K): Connectors[K] => (connectorMode(key) === 'http' ? http[key] : mock[key])

export const connectors: Connectors = {
  sso: pick('sso'),
  myUnpam: pick('myUnpam'),
  mentari: pick('mentari'),
  siskemu: pick('siskemu'),
  ems: pick('ems'),
  myLsp: pick('myLsp'),
  myLb: pick('myLb'),
  sispema: pick('sispema'),
  portal: pick('portal'),
}
