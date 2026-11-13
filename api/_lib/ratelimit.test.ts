import { describe, expect, it } from 'vitest'
import { rateLimit } from './ratelimit.js'

describe('ratelimit', () => {
  it('mengizinkan permintaan dalam batas limit', () => {
    expect(() => {
      rateLimit('test-key-allow', 3, 60)
      rateLimit('test-key-allow', 3, 60)
      rateLimit('test-key-allow', 3, 60)
    }).not.toThrow()
  })

  it('melempar HttpError 429 ketika melebihi limit', () => {
    expect(() => {
      rateLimit('test-key-block', 2, 60)
      rateLimit('test-key-block', 2, 60)
      rateLimit('test-key-block', 2, 60)
    }).toThrow('Terlalu banyak percobaan')
  })
})
