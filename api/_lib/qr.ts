import type { QrKind, QrToken } from '../../src/lib/types.js'
import { hmac, safeEqual } from './crypto.js'

// Kode QR dinamis ditandatangani server: code = HMAC(QR_SECRET, kind|subject|slot), slot = 30 detik.
// Format payload QR tetap: SUPERUNPAM:<KIND>:<subject>:<slot>:<code>. Hanya server yang bisa membuat
// kode yang valid, dan kode hanya diterima pada slot berjalan atau satu slot sebelumnya (±30–60 dtk).

export const QR_PERIOD = 30

const slotNow = () => Math.floor(Date.now() / 1000 / QR_PERIOD)

export function qrCode(kind: QrKind, subject: string, slot: number) {
  const n = hmac('QR_SECRET', `${kind}|${subject}|${slot}`).readUIntBE(0, 6)
  return n.toString(36).toUpperCase().padStart(7, '0').slice(-7)
}

export function issueQr(kind: QrKind, subject: string): QrToken {
  const now = Math.floor(Date.now() / 1000)
  const slot = Math.floor(now / QR_PERIOD)
  return { kind, subject, slot, code: qrCode(kind, subject, slot), expiresIn: QR_PERIOD - (now % QR_PERIOD), period: QR_PERIOD }
}

/** Valid bila cocok dengan slot berjalan atau satu slot sebelumnya (toleransi jeda pindai). */
export function verifyCode(kind: QrKind, subject: string, code: string, slot?: number) {
  const now = slotNow()
  const slots = slot === undefined ? [now, now - 1] : [slot].filter((s) => s === now || s === now - 1)
  return slots.some((s) => safeEqual(code, qrCode(kind, subject, s)))
}

const PAYLOAD = /^SUPERUNPAM:(KTM|PRESENSI|GERBANG):([A-Za-z0-9-]{1,40}):(\d{1,12}):([A-Z0-9]{7})$/

export function parseQrPayload(raw: string) {
  const m = PAYLOAD.exec(raw)
  return m ? { kind: m[1] as QrKind, subject: m[2], slot: Number(m[3]), code: m[4] } : null
}

// — Gerbang keluar: satu kode QR hanya bisa membuka palang sekali (anti dipakai ulang/dibagikan).
// TODO(BFF): simpan di penyimpanan bersama (Redis/KV) agar berlaku lintas instance & validator lokal.
const terpakai = new Map<string, number>()

/** true bila kode belum pernah dipakai; menandainya terpakai sampai kedaluwarsa (2 slot). */
export function pakaiSekali(kind: QrKind, subject: string, slot: number, nowMs = Date.now()) {
  for (const [k, habis] of terpakai) if (habis <= nowMs) terpakai.delete(k)
  const kunci = `${kind}|${subject}|${slot}`
  if (terpakai.has(kunci)) return false
  terpakai.set(kunci, (slot + 2) * QR_PERIOD * 1000)
  return true
}

/** NIM tersamar untuk log/layar petugas: 2310****01. */
export const samarkan = (nim: string) => (nim.length > 6 ? `${nim.slice(0, 4)}${'*'.repeat(nim.length - 6)}${nim.slice(-2)}` : '****')
