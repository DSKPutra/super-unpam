// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEMO_USER, profilKelayakan } from '../../data/demo'
import type { PendaftaranUjianAkhir, TugasAkhir } from '../../lib/akademik/types'
import { TA_DEMO_KEY, UJIAN_AKHIR_DEMO_KEY } from '../../lib/sumber/ta'

// Tes komponen T06 (penguji DEMO + hasil mahasiswa) dengan sumber demo asli.

vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: profilKelayakan }) } } }
})

const { TugasAkhir: Halaman } = await import('./TugasAkhir')
const tampil = (role: typeof DEMO_USER.role = 'MAHASISWA') => render(<Halaman user={{ ...DEMO_USER, role }} back={() => {}} go={() => {}} />)

const MULAI = new Date(Date.now() + 10 * 86_400_000).toISOString()
const SELESAI = new Date(Date.parse(MULAI) + 2 * 3_600_000).toISOString()
const ta: TugasAkhir = {
  id: 'ta-uji', judul: 'Judul Uji Penilaian', abstrak: 'a', bidang: 'Rekayasa Perangkat Lunak', metode: 'm',
  pilihanPembimbing: ['dsn-siti'], pembimbing: ['dsn-siti'], status: 'UJIAN_PROPOSAL', riwayat: [], perubahan: [],
}
const pd: PendaftaranUjianAkhir = {
  id: 'pd-uji', tugasAkhirId: ta.id, jenis: 'PROPOSAL', status: 'TERJADWAL', berkas: [], riwayat: [],
  sesi: { id: 'pd-uji:sp-1124', jenis: 'PROPOSAL', kode: ta.id, nama: 'PROPOSAL', mulai: MULAI, selesai: SELESAI, ruang: 'R. Sidang 1', petugas: ['dsn-andi', 'dsn-hadi'] },
}

/** Kartu ujian penguji (judul yang sama juga muncul di daftar bimbingan, jadi tunggu baris yang memuat "Penguji:"). */
const kartu = () =>
  waitFor(() => {
    const li = screen.getAllByText('Judul Uji Penilaian').map((e) => e.closest('li')).find((x) => x && within(x).queryByText(/Penguji:/))
    if (!li) throw new Error('kartu ujian belum tampil')
    return li
  })

async function nilaiSebagai(penguji: string, skor: [string, string, string], opsi: { revisi?: boolean } = {}) {
  fireEvent.change(await screen.findByLabelText('Bertindak sebagai penguji (demo)'), { target: { value: penguji } })
  // Tunggu kartu milik penguji ini (data penguji sebelumnya bisa masih tampil sesaat).
  const k = await waitFor(async () => {
    const li = await kartu()
    within(li).getByText('Belum dinilai')
    within(li).getByText(/Lembar dibuka/)
    return li
  })
  fireEvent.click(within(k).getByLabelText('Simulasikan hari ujian (demo)'))
  fireEvent.click(within(k).getByRole('button', { name: 'Buka lembar penilaian' }))
  const f = within(k).getByRole('form', { name: 'Lembar penilaian' })
  ;['Kualitas naskah', 'Presentasi', 'Penguasaan materi'].forEach((label, i) => fireEvent.change(within(f).getByLabelText(`Skor ${label}`), { target: { value: skor[i] } }))
  if (opsi.revisi) {
    fireEvent.click(within(f).getByLabelText('Lulus dengan revisi'))
    fireEvent.click(within(f).getByRole('button', { name: /Tambah butir revisi/ }))
    fireEvent.change(within(f).getByLabelText('Bagian revisi 1'), { target: { value: 'Bab 2' } })
    fireEvent.change(within(f).getByLabelText('Permintaan revisi 1'), { target: { value: 'Tambahkan kajian pustaka terbaru' } })
  }
  fireEvent.click(within(f).getByRole('button', { name: /Kirim penilaian/ }))
  return { k, f }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TA_DEMO_KEY, JSON.stringify({ milikSaya: ta, antrian: null }))
  localStorage.setItem(UJIAN_AKHIR_DEMO_KEY, JSON.stringify({ pendaftaran: [pd], terisi: {} }))
})
afterEach(cleanup)

describe('Penilaian penguji (demo)', () => {
  it('lembar tertutup di luar jendela waktu', async () => {
    tampil('DOSEN')
    const k = await kartu()
    expect((within(k).getByRole('button', { name: 'Buka lembar penilaian' }) as HTMLButtonElement).disabled).toBe(true)
    expect(within(k).getByText('Lembar penilaian belum dibuka.')).toBeTruthy()
  })

  it('skor di luar rentang ditolak; kirim final; penguji lain tersembunyi', async () => {
    tampil('DOSEN')
    const { k, f } = await nilaiSebagai('dsn-andi', ['101', '80', '80'])
    fireEvent.click(within(f).getByRole('button', { name: 'Kirim final' }))
    expect(await within(k).findByText(/Kualitas naskah harus 0–100/)).toBeTruthy()
    fireEvent.change(within(f).getByLabelText('Skor Kualitas naskah'), { target: { value: '85' } })
    fireEvent.click(within(f).getByRole('button', { name: /Kirim penilaian/ }))
    fireEvent.click(within(f).getByRole('button', { name: 'Kirim final' }))
    expect(await screen.findByText(/Lembar penilaian terkirim dan bersifat final/)).toBeTruthy()
    const k2 = await kartu()
    expect(within(k2).getByText('Lembar terkirim')).toBeTruthy()
    expect(within(k2).getByText(/disembunyikan sampai semua penguji mengirim/)).toBeTruthy()
  })

  it('semua penguji mengirim → pratinjau perkiraan, rilis, berita acara; mahasiswa melihat hasil tanpa nilai per penguji', async () => {
    tampil()
    expect(await screen.findByText(/Menunggu hasil/)).toBeTruthy()
    cleanup()

    tampil('DOSEN')
    const a = await nilaiSebagai('dsn-andi', ['90', '90', '90'])
    fireEvent.click(within(a.f).getByRole('button', { name: 'Kirim final' }))
    await screen.findByText(/terkirim dan bersifat final/)
    const b = await nilaiSebagai('dsn-hadi', ['70', '70', '70'], { revisi: true })
    fireEvent.click(within(b.f).getByRole('button', { name: 'Kirim final' }))
    await screen.findByText(/Semua penguji sudah mengirim/)
    const k = await kartu()
    expect(within(k).getByText(/Nilai/).textContent).toMatch(/perkiraan: 80 \(A-\)/)
    expect(within(k).getByText(/Perlu rapat kesepakatan/)).toBeTruthy()
    fireEvent.change(within(k).getByLabelText(/Keputusan/), { target: { value: 'LULUS_REVISI' } })
    fireEvent.click(within(k).getByRole('button', { name: 'Rilis hasil' }))
    await screen.findByText('Hasil dirilis')
    const cetak = document.querySelector('.print-doc')!
    expect(cetak.textContent).toContain('Berita Acara Seminar Proposal')
    expect(cetak.textContent).toContain('Tambahkan kajian pustaka terbaru')
    expect(cetak.textContent).toContain('Tanda tangan elektronik resmi belum tersedia')
    cleanup()

    tampil()
    expect(await screen.findByText('Hasil: Lulus dengan revisi')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Butir revisi' })).getByText('Tambahkan kajian pustaka terbaru')).toBeTruthy()
    expect(screen.queryByText(/90/)).toBeNull()
    expect(screen.getByRole('list', { name: 'Tahap saat ini: Revisi proposal' })).toBeTruthy()
  })
})
