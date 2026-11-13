import { describe, expect, it } from 'vitest'
import { rute } from './parkir-ktm.js'

const r = (p: string) => rute(new Request('https://x.test' + p))

describe('rute parkir/ktm di fungsi qr', () => {
  it('mengenali URL asli maupun hasil rewrite', () => {
    expect(r('/api/parkir/ringkasan')).toEqual({ domain: 'parkir', aksi: 'ringkasan' })
    expect(r('/api/qr/parkir-gerbang')).toEqual({ domain: 'parkir', aksi: 'gerbang' })
    expect(r('/api/ktm/bekukan')).toEqual({ domain: 'ktm', aksi: 'bekukan' })
    expect(r('/api/qr/ktm-log')).toEqual({ domain: 'ktm', aksi: 'log' })
    expect(r('/api/qr/gerbang')).toEqual({ domain: 'qr', aksi: 'gerbang' })
    expect(r('/api/qr/issue?kind=KTM')).toEqual({ domain: 'qr', aksi: 'issue' })
  })
})
