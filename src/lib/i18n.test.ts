import { describe, expect, it } from 'vitest'
import { getDict } from './i18n'

describe('i18n', () => {
  it('ID dan EN memiliki kunci dan jenis nilai yang sama', () => {
    const id = getDict('id')
    const en = getDict('en')
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort())
    for (const k of Object.keys(id) as (keyof typeof id)[]) expect(typeof en[k], k).toBe(typeof id[k])
  })
})
