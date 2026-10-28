// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEMO_USER, profilKelayakan } from '../../data/demo'
import type { ProfilKelayakan } from '../../lib/akademik/types'

// Tes komponen Skripsi/TA dengan sumber demo asli (localStorage jsdom); hanya data kelayakan yang diganti.

const state: { profil: ProfilKelayakan } = { profil: profilKelayakan }
vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: state.profil }) } } }
})

const { TugasAkhir } = await import('./TugasAkhir')
const go = vi.fn()
const tampil = (role: typeof DEMO_USER.role = 'MAHASISWA') => render(<TugasAkhir user={{ ...DEMO_USER, role }} back={() => {}} go={go} />)
const ketik = (label: RegExp | string, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } })

async function isiDanAjukan(judul = 'Klasifikasi Citra Daun Padi dengan CNN') {
  await screen.findByRole('heading', { name: /Ajukan judul/i })
  ketik(/^Judul/, judul)
  ketik(/Bidang/, 'Kecerdasan Buatan & Data')
  ketik(/Abstrak/, 'Penelitian ini mengklasifikasikan penyakit daun padi dari citra memakai CNN (contoh).')
  ketik(/Rencana metode/, 'Pengumpulan citra, augmentasi, pelatihan, evaluasi.')
  ketik('Pilihan 1', 'dsn-rina')
  ketik('Pilihan 2', 'dsn-andi')
  ketik('Pilihan 3', 'dsn-siti')
  fireEvent.click(screen.getByRole('button', { name: 'Ajukan judul' }))
}

beforeEach(() => {
  localStorage.clear()
  state.profil = profilKelayakan
})
afterEach(cleanup)

describe('Skripsi/TA — mahasiswa', () => {
  it('belum layak: syarat kurang + estimasi semester, tanpa formulir', async () => {
    state.profil = { ...profilKelayakan, sks: 84 }
    tampil()
    expect(await screen.findByText(/84 SKS, minimal 110 SKS/)).toBeTruthy()
    expect(screen.getByText(/±2 semester lagi/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Ajukan judul/i })).toBeNull()
  })

  it('validasi formulir dan peringatan judul mirip', async () => {
    tampil()
    await screen.findByRole('heading', { name: /Ajukan judul/i })
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan judul' }))
    expect(screen.getByText('Judul wajib diisi.')).toBeTruthy()
    expect(screen.getByText('Pilih 3 calon pembimbing.')).toBeTruthy()
    ketik(/^Judul/, 'Rekomendasi Buku Perpustakaan Kampus Collaborative Filtering')
    expect(screen.getByText(/Judul mirip dengan yang sudah terdaftar/)).toBeTruthy()
    // Dosen dengan kuota penuh tidak muncul sebagai pilihan.
    expect(within(screen.getByLabelText('Pilihan 1')).queryByText(/Budi Santoso/)).toBeNull()
  })

  it('ajukan → linimasa; tanpa pembimbing belum bisa mulai bimbingan', async () => {
    tampil()
    await isiDanAjukan()
    expect(await screen.findByText('Klasifikasi Citra Daun Padi dengan CNN')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Tahap saat ini: Diajukan' })).toBeTruthy()
    expect(screen.getByText(/Bimbingan baru bisa dimulai setelah pembimbing ditetapkan/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mulai bimbingan' })).toBeNull()
  })

  it('ditolak dosen → alasan tampil, ajukan ulang menyimpan riwayat', async () => {
    tampil()
    await isiDanAjukan()
    await screen.findByText('Klasifikasi Citra Daun Padi dengan CNN')
    cleanup()

    tampil('DOSEN')
    expect(await screen.findByText(/Tampilan dosen \(demo\)/)).toBeTruthy()
    const kartu = (await screen.findByText('Klasifikasi Citra Daun Padi dengan CNN')).closest('li')!
    fireEvent.click(within(kartu).getByRole('button', { name: /Tolak/ }))
    fireEvent.change(within(kartu).getByLabelText('Alasan penolakan'), { target: { value: 'Ruang lingkup terlalu luas' } })
    fireEvent.click(within(kartu).getByRole('button', { name: 'Tolak' }))
    await screen.findByText(/ditolak dengan alasan/)
    cleanup()

    tampil()
    expect(within(await screen.findByRole('alert')).getByText(/Ruang lingkup terlalu luas/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan ulang' }))
    await screen.findByRole('heading', { name: /Ajukan judul/i })
    // Formulir terisi dari pengajuan sebelumnya; riwayat (3 entri) tetap ada di penyimpanan.
    expect((screen.getByLabelText(/^Judul/) as HTMLTextAreaElement).value).toBe('Klasifikasi Citra Daun Padi dengan CNN')
    expect(JSON.parse(localStorage.getItem('su:ta:demo')!).milikSaya.riwayat).toHaveLength(3)
  })

  it('disetujui → pembimbing tampil, jadwalkan bimbingan, mulai bimbingan, perubahan tidak langsung mengubah data', async () => {
    tampil()
    await isiDanAjukan()
    await screen.findByText('Klasifikasi Citra Daun Padi dengan CNN')
    cleanup()
    tampil('DOSEN')
    const kartu = (await screen.findByText('Klasifikasi Citra Daun Padi dengan CNN')).closest('li')!
    fireEvent.click(within(kartu).getByRole('button', { name: 'Setujui' }))
    await screen.findByText(/Judul disetujui/)
    cleanup()

    tampil()
    expect(await screen.findByText('Rina Kartika, M.T.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Jadwalkan bimbingan/ }))
    expect(go).toHaveBeenCalledWith('booking/dosen')
    fireEvent.click(screen.getByRole('button', { name: 'Mulai bimbingan' }))
    await waitFor(() => expect(screen.getByRole('list', { name: 'Tahap saat ini: Bimbingan' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Ajukan perubahan' }))
    fireEvent.change(screen.getByLabelText('Usulan'), { target: { value: 'Judul baru yang diusulkan' } })
    fireEvent.change(screen.getByLabelText('Alasan'), { target: { value: 'Data penelitian berubah' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan perubahan' }))
    expect(await screen.findByText(/Judul: Judul baru yang diusulkan/)).toBeTruthy()
    expect(screen.getByText('Menunggu')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Klasifikasi Citra Daun Padi dengan CNN' })).toBeTruthy()
  })
})
