// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { profilKelayakan, ujianSemester } from '../../data/demo'
import { DEMO_USER } from '../../data/demo'
import type { JadwalUjianSemester, ProfilKelayakan } from '../../lib/akademik/types'

// Tes komponen Exam Center: layak, tidak layak, bentrok, dan kosong. Sumber data diganti mock.

const state: { jadwal: Partial<Record<string, JadwalUjianSemester>>; profil: ProfilKelayakan } = { jadwal: {}, profil: profilKelayakan }

vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return {
    ...asli,
    sumber: {
      ...asli.sumber,
      ujian: {
        jadwal: async (j: string) => ({ asal: 'contoh', data: state.jadwal[j] ?? { ...ujianSemester.SUSULAN, jenis: j } }),
        kelayakan: async () => ({ asal: 'contoh', data: state.profil }),
        pengajuan: async () => ({ asal: 'contoh', data: [] }),
        ajukan: vi.fn(),
      },
    },
  }
})
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,AAAA' } }))

const { Ujian } = await import('./Ujian')
/** Baris daftar jadwal (nama MK juga muncul di dokumen cetak tersembunyi, yang bukan <li>). */
const baris = (nama: string) => screen.getAllByText(nama).map((e) => e.closest('li')).find((x): x is HTMLLIElement => !!x)!
const tampil = () => render(<Ujian user={DEMO_USER} back={() => {}} go={() => {}} />)

beforeEach(() => {
  state.jadwal = { UTS: ujianSemester.UTS, UAS: ujianSemester.UAS }
  state.profil = profilKelayakan
})
afterEach(cleanup)

describe('Exam Center', () => {
  it('layak & tidak layak: QR dibuat, alasan tampil, label data contoh', async () => {
    tampil()
    expect(await screen.findByAltText('QR kartu ujian')).toBeTruthy()
    expect(screen.getByText('Data contoh')).toBeTruthy()
    expect(screen.getByText(/Berlaku untuk 4 dari 5 mata kuliah/)).toBeTruthy()
    const ai = baris('Kecerdasan Buatan')
    expect(within(ai).getByText('Belum memenuhi syarat')).toBeTruthy()
    expect(within(ai).getByText(/Kehadiran 68%, minimal 75%/)).toBeTruthy()
    expect(within(ai).getByRole('button', { name: 'Selesaikan' })).toBeTruthy()
    expect(within(baris('Pemrograman Web')).getByText('Boleh ikut')).toBeTruthy()
  })

  it('bentrok dan jadwal berubah ditandai', async () => {
    tampil()
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Jadwal bentrok')).toBeTruthy()
    expect(alert.textContent).toMatch(/Kecerdasan Buatan.*Rekayasa Perangkat Lunak/)
    expect(within(baris('Basis Data Lanjut')).getByText('Berubah')).toBeTruthy()
    expect(screen.getByText(/Jeda hanya 20 menit/)).toBeTruthy()
  })

  it('tidak ada yang layak: tanpa QR, dengan penjelasan', async () => {
    state.profil = { ...profilKelayakan, keuanganLunas: false }
    tampil()
    expect(await screen.findByText(/Kartu ujian belum dapat dibuat/)).toBeTruthy()
    expect(screen.queryByAltText('QR kartu ujian')).toBeNull()
  })

  it('kosong: pesan jelas per jenis ujian', async () => {
    tampil()
    await screen.findByAltText('QR kartu ujian')
    fireEvent.click(screen.getByRole('tab', { name: 'Susulan' }))
    expect(await screen.findByText(/Belum ada jadwal Ujian Susulan/)).toBeTruthy()
    expect(screen.queryByAltText('QR kartu ujian')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kirim pengajuan' })).toBeTruthy())
    expect((screen.getByRole('button', { name: 'Kirim pengajuan' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
