import { beforeAll, describe, expect, it } from 'vitest'
import { issueQr, pakaiSekali, parseQrPayload, QR_PERIOD, samarkan, verifyCode } from './qr.js'

// QR gerbang keluar: format, tanda tangan, dan sekali pakai.

beforeAll(() => {
  process.env.QR_SECRET = 'x'.repeat(40)
})

describe('QR gerbang', () => {
  it('payload GERBANG terbaca dan tanda tangannya valid hanya untuk jenis yang sama', () => {
    const t = issueQr('GERBANG', '231011400001')
    const qr = parseQrPayload(`SUPERUNPAM:GERBANG:${t.subject}:${t.slot}:${t.code}`)
    expect(qr).toMatchObject({ kind: 'GERBANG', subject: '231011400001' })
    expect(verifyCode('GERBANG', qr!.subject, qr!.code, qr!.slot)).toBe(true)
    expect(verifyCode('KTM', qr!.subject, qr!.code, qr!.slot)).toBe(false)
  })

  it('satu kode hanya membuka palang sekali; kode slot lain tetap bisa', () => {
    const now = 1_800_000_000_000
    const slot = Math.floor(now / 1000 / QR_PERIOD)
    expect(pakaiSekali('GERBANG', 'A1', slot, now)).toBe(true)
    expect(pakaiSekali('GERBANG', 'A1', slot, now + 1000)).toBe(false)
    expect(pakaiSekali('GERBANG', 'A1', slot + 1, now + 1000)).toBe(true)
    // Setelah kedaluwarsa, catatan dibuang (kodenya sendiri sudah tidak lolos verifyCode).
    expect(pakaiSekali('GERBANG', 'A1', slot, now + 3 * QR_PERIOD * 1000)).toBe(true)
  })

  it('NIM disamarkan untuk log', () => {
    expect(samarkan('231011400001')).toBe('2310******01')
    expect(samarkan('123')).toBe('****')
  })
})
