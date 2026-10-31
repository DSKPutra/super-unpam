import { describe, expect, it } from 'vitest'
import { isValidNimNidn, sanitizeInput } from './security'

describe('security - sanitizeInput', () => {
  it('membersihkan tag <script> dan payload XSS', () => {
    const raw = 'Halo <script>alert("hacked")</script> kawan'
    expect(sanitizeInput(raw)).toBe('Halo  kawan')
  })

  it('membersihkan iframe dan inline event handler', () => {
    const raw = '<iframe src="evil.com"></iframe><img src=x onerror=alert(1)>'
    expect(sanitizeInput(raw)).not.toContain('iframe')
    expect(sanitizeInput(raw)).not.toContain('onerror=')
  })

  it('membersihkan karakter kontrol tersembunyi (zero-width characters)', () => {
    const raw = 'Text\u200BWith\uFEFFZeroWidth'
    expect(sanitizeInput(raw)).toBe('TextWithZeroWidth')
  })

  it('memotong panjang masukan sesuai batas maxLength', () => {
    const longText = 'A'.repeat(500)
    expect(sanitizeInput(longText, 50).length).toBe(50)
  })
})

describe('security - isValidNimNidn', () => {
  it('valid untuk NIM UNPAM (12 digit numerik)', () => {
    expect(isValidNimNidn('2021140001')).toBe(true)
  })

  it('menolak input mengandung alfabet atau karakter berbahaya', () => {
    expect(isValidNimNidn('2021140001; DROP TABLE')).toBe(false)
    expect(isValidNimNidn('admin')).toBe(false)
    expect(isValidNimNidn('')).toBe(false)
  })
})
