// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DEMO_USER } from '../data/demo'
import { FEATURES } from '../data/features'
import { GerbangPage } from './Gerbang'

afterEach(cleanup)

describe('QR Gerbang Keluar', () => {
  it('menampilkan QR sekali pakai, hitung mundur, dan cadangan kartu', async () => {
    render(<GerbangPage user={DEMO_USER} back={() => {}} />)
    expect(await screen.findByText(/Berganti dalam \d+ detik · sekali pakai/)).toBeTruthy()
    expect(screen.getByText(/Kartu mahasiswa tetap bisa ditempel/)).toBeTruthy()
    expect(screen.getByText(/Mode demo/)).toBeTruthy()
  })

  it('terdaftar sebagai fitur untuk semua peran', () => {
    expect(FEATURES.find((f) => f.id === 'gerbang')).toMatchObject({ route: 'gerbang', roles: expect.arrayContaining(['MAHASISWA', 'DOSEN', 'TENDIK']) })
  })
})
