/**
 * Utilitas sanitasi dan validasi keamanan masukan pengguna.
 * Melindungi dari XSS, penanaman karakter kontrol tersembunyi, dan injeksi payload.
 */

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:[^'"]*/gi,
  /vbscript:[^'"]*/gi,
  /on\w+\s*=/gi,
]

/**
 * Membersihkan masukan teks bebas pengguna sebelum disimpan atau dikirim ke API/state.
 */
export function sanitizeInput(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return ''

  // 1. Bersihkan karakter kontrol tak kasat mata
  let cleaned = input.replace(CONTROL_CHARS_REGEX, '')

  // 2. Buang tag skrip, iframe, dan event handler
  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  // 3. Batasi panjang maksimal
  cleaned = cleaned.trim().slice(0, maxLength)

  return cleaned
}

/**
 * Validasi NIM / NIDN (hanya digit numerik 8–18 digit).
 */
export function isValidNimNidn(val: string): boolean {
  return /^\d{8,18}$/.test(val.trim())
}
