// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { User } from '../../lib/types'
import { Perpustakaan } from './Perpustakaan'

const alumni: User = { name: 'Alumni', nim: '191011400999', role: 'ALUMNI', prodi: 'Teknik Informatika', fakultas: 'FT', angkatan: '2019' }
afterEach(cleanup)

describe('Digital Library', () => {
  it('cari & filter repositori; embargo menahan teks lengkap; sitasi tampil', async () => {
    render(<Perpustakaan user={alumni} back={() => {}} />)
    expect(await screen.findByText(/^10 karya ditemukan/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Jenis karya'), { target: { value: 'DISERTASI' } })
    expect(screen.getByText(/^2 karya ditemukan/)).toBeTruthy()
    const li = screen.getByText(/Rantai Pasok Halal/).closest('li')!
    fireEvent.click(within(li).getByText('Abstrak & sitasi'))
    expect(within(li).getByText(/diembargo penulis sampai/)).toBeTruthy()
    expect(within(li).queryByText('Baca teks lengkap')).toBeNull()
    fireEvent.change(screen.getByLabelText('Jenis karya'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Cari karya akhir'), { target: { value: 'utaut2' } })
    const t = screen.getByText(/Model Adopsi Layanan/).closest('li')!
    fireEvent.click(within(t).getByText('Abstrak & sitasi'))
    expect(within(t).getByText(/Anggraini, M\. \(2024\)/)).toBeTruthy()
    expect(within(t).getByText('Baca teks lengkap')).toBeTruthy()
  })

  it('katalog: ketersediaan dan antre', async () => {
    render(<Perpustakaan user={alumni} back={() => {}} />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Katalog' }))
    const li = (await screen.findByText(/Metodologi Penelitian/)).closest('li')!
    expect(within(li).getByText('Semua dipinjam')).toBeTruthy()
    fireEvent.click(within(li).getByText('Antre'))
    expect(within(li).getByText('Masuk antrean')).toBeTruthy()
  })
})
