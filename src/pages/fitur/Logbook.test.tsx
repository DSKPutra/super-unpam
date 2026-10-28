// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEMO_USER, profilKelayakan } from '../../data/demo'
import type { TugasAkhir } from '../../lib/akademik/types'
import { TA_DEMO_KEY } from '../../lib/sumber/ta'

// Tes komponen logbook (T04) dengan sumber demo asli; TA pengguna langsung disiapkan di tahap BIMBINGAN.

vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: profilKelayakan }) } } }
})

const { TugasAkhir: Halaman } = await import('./TugasAkhir')
const tampil = (role: typeof DEMO_USER.role = 'MAHASISWA') => render(<Halaman user={{ ...DEMO_USER, role }} back={() => {}} go={() => {}} />)

const milik: TugasAkhir = {
  id: 'ta-uji',
  judul: 'Judul Uji Logbook',
  abstrak: 'a',
  bidang: 'Rekayasa Perangkat Lunak',
  metode: 'm',
  pilihanPembimbing: ['dsn-siti'],
  pembimbing: ['dsn-siti'],
  status: 'BIMBINGAN',
  riwayat: [{ dari: 'DISETUJUI_PEMBIMBING', ke: 'BIMBINGAN', peristiwa: 'MULAI_BIMBINGAN', pelaku: 'MAHASISWA', waktu: new Date().toISOString() }],
  perubahan: [],
}

/** Baris entri logbook (judul entri juga muncul di kartu cetak tersembunyi, yang bukan <li>). */
const barisEntri = (teks: string) => screen.getAllByText(teks).map((e) => e.closest('li')).find((x): x is HTMLLIElement => !!x)!
const kemarin = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(Date.now() - 86_400_000))

async function catatBimbingan(bagian: string) {
  fireEvent.click(await screen.findByRole('button', { name: 'Catat bimbingan' }))
  fireEvent.change(screen.getByLabelText('Tanggal bimbingan'), { target: { value: kemarin() } })
  fireEvent.change(screen.getByLabelText('Bab/bagian yang dibahas'), { target: { value: bagian } })
  fireEvent.change(screen.getByLabelText('Ringkasan arahan dosen'), { target: { value: 'Perbaiki rumusan masalah dan tujuan penelitian' } })
  fireEvent.click(screen.getByRole('button', { name: 'Simpan entri' }))
  await screen.findByText(/Entri bimbingan dicatat/)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TA_DEMO_KEY, JSON.stringify({ milikSaya: milik, antrian: null }))
})
afterEach(cleanup)

describe('Logbook bimbingan', () => {
  it('entri baru menunggu verifikasi dan belum dihitung', async () => {
    tampil()
    expect(await screen.findByText(/bimbingan disetujui untuk Seminar Proposal/)).toBeTruthy()
    expect(screen.getByText('0 dari 4')).toBeTruthy()
    await catatBimbingan('Bab 1 Pendahuluan')
    const entri = screen.getByText('Bab 1 Pendahuluan').closest('li')!
    expect(within(entri).getByText('Menunggu verifikasi')).toBeTruthy()
    expect(screen.getByText('0 dari 4')).toBeTruthy()
    // Kartu bimbingan hanya untuk entri sah: belum ada → tombol nonaktif.
    expect((screen.getByRole('button', { name: /Cetak kartu bimbingan/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('validasi entri: ringkasan pendek ditolak', async () => {
    tampil()
    fireEvent.click(await screen.findByRole('button', { name: 'Catat bimbingan' }))
    fireEvent.change(screen.getByLabelText('Ringkasan arahan dosen'), { target: { value: 'pendek' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan entri' }))
    expect(screen.getByText('Tanggal bimbingan wajib diisi.')).toBeTruthy()
    expect(screen.getByText('Ringkasan arahan minimal 20 karakter.')).toBeTruthy()
  })

  it('dosen menyetujui → dihitung sah dan masuk kartu bimbingan; mahasiswa contoh berjeda lama ditandai', async () => {
    tampil()
    await catatBimbingan('Bab 2 Tinjauan Pustaka')
    cleanup()

    tampil('DOSEN')
    const kartu = (await screen.findByText('Judul Uji Logbook')).closest('li')!
    expect(within(kartu).getByText(/0 bimbingan disetujui · 1 menunggu verifikasi/)).toBeTruthy()
    const contoh = screen.getByText(/Optimasi Rute Pengantaran Kantin/).closest('li')!
    expect(within(contoh).getByText('Perlu perhatian')).toBeTruthy()
    fireEvent.click(within(kartu).getByRole('button', { name: 'Setujui entri' }))
    await screen.findByText(/Entri bimbingan disetujui/)
    cleanup()

    tampil()
    expect(await screen.findByText('1 dari 4')).toBeTruthy()
    expect(within(barisEntri('Bab 2 Tinjauan Pustaka')).getByText('Disetujui')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Cetak kartu bimbingan/ }) as HTMLButtonElement).disabled).toBe(false)
    const cetak = document.querySelector('.print-doc')!
    expect(cetak.textContent).toContain('Bab 2 Tinjauan Pustaka')
    expect(cetak.textContent).toContain('Hanya memuat 1 entri yang disetujui')
  })

  it('dosen menolak tanpa alasan tidak bisa; dengan alasan tampil di mahasiswa', async () => {
    tampil()
    await catatBimbingan('Bab 3 Metodologi')
    cleanup()
    tampil('DOSEN')
    const kartu = (await screen.findByText('Judul Uji Logbook')).closest('li')!
    fireEvent.click(within(kartu).getByRole('button', { name: 'Tolak…' }))
    expect((within(kartu).getByRole('button', { name: 'Tolak entri' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(within(kartu).getByLabelText('Alasan penolakan'), { target: { value: 'Tanggal tidak sesuai jadwal' } })
    fireEvent.click(within(kartu).getByRole('button', { name: 'Tolak entri' }))
    await screen.findByText(/ditolak dengan alasan/)
    cleanup()
    tampil()
    const entri = (await screen.findByText('Bab 3 Metodologi')).closest('li')!
    expect(within(entri).getByText('Ditolak')).toBeTruthy()
    expect(within(entri).getByText(/Tanggal tidak sesuai jadwal/)).toBeTruthy()
    expect(screen.getByText('0 dari 4')).toBeTruthy()
  })

  it('versi draf: hash dicatat, isi identik ditolak, versi lama tetap', async () => {
    tampil()
    const unggah = async (isi: string, catatan: string) => {
      const f = new File([isi], 'draf.pdf', { type: 'application/pdf' })
      fireEvent.change(await screen.findByLabelText('Unggah versi baru'), { target: { files: [f] } })
      fireEvent.change(screen.getByLabelText('Catatan perubahan'), { target: { value: catatan } })
      fireEvent.click(screen.getByRole('button', { name: /Simpan versi/ }))
    }
    await unggah('isi draf pertama', 'Draf awal')
    await waitFor(() => expect(screen.getByText(/v1 · draf\.pdf/)).toBeTruthy())
    expect(screen.getByText(/SHA-256 [0-9a-f]{64}/)).toBeTruthy()
    await unggah('isi draf pertama', 'Coba lagi')
    expect(await screen.findByText('Isi berkas sama dengan versi v1.')).toBeTruthy()
    await unggah('isi draf kedua', 'Revisi bab 1')
    await waitFor(() => expect(screen.getByText(/v2 · draf\.pdf/)).toBeTruthy())
    expect(within(screen.getByRole('list', { name: 'Daftar versi draf' })).getAllByRole('listitem')).toHaveLength(2)
  })
})
