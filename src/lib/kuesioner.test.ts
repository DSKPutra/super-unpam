import { beforeEach, describe, expect, it } from 'vitest'
import { bacaDraf, hapusDraf, hapusSemuaDraf, kemajuan, simpanDraf, sisaHari, susunPayload, validasi, validasiSemua, type Kuesioner } from './kuesioner'

const K: Kuesioner = {
  id: 'k1',
  judul: 'Uji',
  anonim: true,
  pertanyaan: [
    { id: 's', teks: 'Skala', tipe: 'skala', wajib: true },
    { id: 'p', teks: 'Pilihan', tipe: 'pilihan', wajib: true, opsi: ['A', 'B'] },
    { id: 't', teks: 'Teks', tipe: 'teks', wajib: false, maxLength: 5 },
  ],
}
const [S, P, T] = K.pertanyaan

describe('validasi', () => {
  it('wajib kosong ditolak, opsional kosong diterima', () => {
    expect(validasi(S, undefined)).toMatch(/wajib/)
    expect(validasi(P, '')).toMatch(/wajib/)
    expect(validasi(T, undefined)).toBeNull()
    expect(validasi(T, '   ')).toBeNull()
  })

  it('rentang skala bawaan 1–5 dan bilangan bulat', () => {
    expect(validasi(S, 1)).toBeNull()
    expect(validasi(S, 5)).toBeNull()
    expect(validasi(S, 0)).toMatch(/1–5/)
    expect(validasi(S, 6)).toMatch(/1–5/)
    expect(validasi(S, 2.5)).toMatch(/1–5/)
    expect(validasi(S, '3')).toMatch(/1–5/)
    expect(validasi({ ...S, min: 0, max: 10 }, 10)).toBeNull()
  })

  it('pilihan harus salah satu opsi; teks dibatasi panjang', () => {
    expect(validasi(P, 'A')).toBeNull()
    expect(validasi(P, 'C')).toMatch(/opsi/)
    expect(validasi(T, '12345')).toBeNull()
    expect(validasi(T, '123456')).toMatch(/Maksimal 5/)
  })

  it('validasiSemua mengumpulkan galat per id', () => {
    expect(Object.keys(validasiSemua(K, { s: 9 }))).toEqual(['s', 'p'])
    expect(validasiSemua(K, { s: 3, p: 'B' })).toEqual({})
  })
})

describe('kemajuan', () => {
  it('menghitung jawaban valid dan kesiapan kirim', () => {
    expect(kemajuan(K, {})).toEqual({ terjawab: 0, total: 3, persen: 0, siapKirim: false })
    expect(kemajuan(K, { s: 4 })).toMatchObject({ terjawab: 1, persen: 33, siapKirim: false })
    expect(kemajuan(K, { s: 4, p: 'A' })).toMatchObject({ terjawab: 2, siapKirim: true })
    expect(kemajuan(K, { s: 4, p: 'A', t: 'ok' })).toMatchObject({ terjawab: 3, persen: 100, siapKirim: true })
  })

  it('jawaban tidak valid tidak dihitung dan menahan pengiriman', () => {
    expect(kemajuan(K, { s: 99, p: 'A' })).toMatchObject({ terjawab: 1, siapKirim: false })
    expect(kemajuan(K, { s: 3, p: 'A', t: 'terlalu panjang' })).toMatchObject({ siapKirim: false })
  })

  it('kuesioner tanpa pertanyaan', () => {
    expect(kemajuan({ ...K, pertanyaan: [] }, {})).toEqual({ terjawab: 0, total: 0, persen: 0, siapKirim: true })
  })
})

describe('susunPayload (anonimitas)', () => {
  const nim = '231011400001'

  it('anonim: tanpa NIM di mana pun dalam payload, memakai token', () => {
    const p = susunPayload(K, { s: 4, p: 'A', t: ` ${nim} ` }, { nim, token: 'tok-1' })
    expect(p).toEqual({ kuesionerId: 'k1', jawaban: { s: 4, p: 'A', t: nim }, token: 'tok-1' })
    expect(p).not.toHaveProperty('nim')
    // NIM hanya boleh muncul bila pengguna sendiri mengetiknya sebagai jawaban teks.
    expect(JSON.stringify({ ...p, jawaban: { ...p.jawaban, t: '' } })).not.toContain(nim)
  })

  it('anonim tanpa token ditolak (tidak jatuh ke mode bernama)', () => {
    expect(() => susunPayload(K, { s: 4, p: 'A' }, { nim })).toThrow(/Token/)
  })

  it('bernama: memuat NIM, tanpa token', () => {
    expect(susunPayload({ ...K, anonim: false }, { s: 4, p: 'A' }, { nim, token: 'x' })).toEqual({ kuesionerId: 'k1', jawaban: { s: 4, p: 'A' }, nim })
  })

  it('jawaban kosong dan id asing dibuang', () => {
    expect(susunPayload(K, { s: 4, p: 'A', t: '  ', asing: 'x' }, { nim, token: 't' }).jawaban).toEqual({ s: 4, p: 'A' })
  })
})

describe('sisaHari', () => {
  const now = Date.parse('2026-10-28T00:00:00Z')
  it('dibulatkan ke atas; lewat bernilai negatif; tanpa tenggat null', () => {
    expect(sisaHari('2026-10-30T00:00:00Z', now)).toBe(2)
    expect(sisaHari('2026-10-28T12:00:00Z', now)).toBe(1)
    expect(sisaHari('2026-10-26T00:00:00Z', now)).toBe(-2)
    expect(sisaHari(undefined, now)).toBeNull()
  })
})

describe('draf', () => {
  const mem = () => {
    const m = new Map<string, string>()
    return new Proxy(
      {
        getItem: (k: string) => m.get(k) ?? null,
        setItem: (k: string, v: string) => void m.set(k, v),
        removeItem: (k: string) => void m.delete(k),
      },
      { ownKeys: () => [...m.keys()], getOwnPropertyDescriptor: (t, k) => (m.has(String(k)) ? { enumerable: true, configurable: true, value: m.get(String(k)) } : Reflect.getOwnPropertyDescriptor(t, k)) },
    )
  }
  beforeEach(() => {
    Object.assign(globalThis, { localStorage: mem(), sessionStorage: mem() })
  })

  it('anonim di sessionStorage, bernama di localStorage; bertahan dibaca ulang', () => {
    simpanDraf(K, { jawaban: { s: 2 }, langkah: 2 })
    simpanDraf({ ...K, id: 'k2', anonim: false }, { jawaban: { s: 5 }, langkah: 1 })
    expect(sessionStorage.getItem('su:kuesioner:draf:k1')).toContain('"s":2')
    expect(localStorage.getItem('su:kuesioner:draf:k2')).toContain('"s":5')
    expect(bacaDraf(K)).toMatchObject({ jawaban: { s: 2 }, langkah: 2 })
  })

  it('hapus setelah terkirim dan saat keluar akun', () => {
    simpanDraf(K, { jawaban: { s: 2 }, langkah: 1 })
    hapusDraf(K)
    expect(bacaDraf(K)).toBeNull()
    simpanDraf(K, { jawaban: {}, langkah: 0 })
    simpanDraf({ ...K, id: 'k2', anonim: false }, { jawaban: {}, langkah: 0 })
    localStorage.setItem('su:theme', '"dark"')
    hapusSemuaDraf()
    expect(bacaDraf(K)).toBeNull()
    expect(localStorage.getItem('su:kuesioner:draf:k2')).toBeNull()
    expect(localStorage.getItem('su:theme')).toBe('"dark"')
  })

  it('draf rusak diabaikan', () => {
    sessionStorage.setItem('su:kuesioner:draf:k1', '{rusak')
    expect(bacaDraf(K)).toBeNull()
  })
})
