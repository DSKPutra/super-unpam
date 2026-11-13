// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { sumber } from '../../lib/sumber'
import { UjianDaring } from './UjianDaring'

// Tes komponen T09: soal hanya setelah mulai, struk dengan jam server, kirim ulang tidak menggandakan.

const kartu = async (mk: string) => (await screen.findByText(new RegExp(`^${mk} · UTS`))).closest('li')!
const unggah = (li: HTMLElement, isi: string) =>
  fireEvent.change(within(li).getByLabelText(/Unggah jawaban/), { target: { files: [new File([isi], 'jawaban.pdf', { type: 'application/pdf' })] } })

beforeEach(() => localStorage.clear())
afterEach(() => (cleanup(), vi.restoreAllMocks()))

describe('Ujian daring (unggah jawaban)', () => {
  it('soal & unggahan hanya untuk ujian berlangsung; tanpa perekaman', async () => {
    render(<UjianDaring aturan={ATURAN_BAWAAN} />)
    const aktif = await kartu('Basis Data Lanjut')
    expect(within(aktif).getByText('Berlangsung')).toBeTruthy()
    expect(within(aktif).getByRole('link', { name: /Soal UTS Basis Data Lanjut/ })).toBeTruthy()
    const besok = await kartu('Kecerdasan Buatan')
    expect(within(besok).getByText('Soal dirilis server saat ujian dimulai.')).toBeTruthy()
    expect(within(besok).queryByRole('link')).toBeNull()
    expect(within(besok).queryByLabelText(/Unggah jawaban/)).toBeNull()
    expect(within(await kartu('Grafika Komputer')).getByText('Ditutup')).toBeTruthy()
    expect(screen.getByText(/Tidak ada perekaman kamera, layar, atau mikrofon/)).toBeTruthy()
  })

  it('respons hilang setelah server menerima → kirim ulang dengan kunci sama tidak menggandakan', async () => {
    const asli = sumber.ujian.kirimJawaban
    let pertama = true
    vi.spyOn(sumber.ujian, 'kirimJawaban').mockImplementation(async (id, b) => {
      const r = await asli(id, b)
      if (pertama) {
        pertama = false
        throw new Error('Sambungan terputus.')
      }
      return r
    })
    render(<UjianDaring aturan={ATURAN_BAWAAN} />)
    const li = await kartu('Basis Data Lanjut')
    unggah(li, 'jawaban akhir')
    expect(await within(li).findByText('Gagal mengirim: Sambungan terputus.')).toBeTruthy()
    fireEvent.click(within(li).getByRole('button', { name: 'Kirim ulang (tidak dobel)' }))
    expect(await within(li).findByText('Jawaban ini sudah diterima sebelumnya; tidak dikirim dua kali.')).toBeTruthy()
    await waitFor(() => expect(within(li).getByText(/Struk kiriman terakhir \(versi 1 dari 1\)/)).toBeTruthy())
    expect(within(li).getByText(/jam server\) · SHA-256 [0-9a-f]{64}/)).toBeTruthy()

    // Berkas baru = kunci baru = versi baru.
    unggah(li, 'jawaban revisi')
    await waitFor(() => expect(within(li).getByText(/versi 2 dari 2/)).toBeTruthy())
  })
})
