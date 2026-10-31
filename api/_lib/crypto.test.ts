import { describe, expect, it } from 'vitest'
import { safeEqual } from './crypto.js'

describe('crypto - safeEqual', () => {
  it('mengembalikan true untuk string identik', () => {
    expect(safeEqual('abc123xyz', 'abc123xyz')).toBe(true)
    expect(safeEqual('', '')).toBe(true)
  })

  it('mengembalikan false untuk string berbeda dengan panjang sama', () => {
    expect(safeEqual('abc123xyz', 'abc123xyw')).toBe(false)
  })

  it('mengembalikan false untuk string dengan panjang berbeda tanpa melempar error', () => {
    expect(safeEqual('short', 'longer-string')).toBe(false)
    expect(safeEqual('longer-string', 'short')).toBe(false)
  })
})
