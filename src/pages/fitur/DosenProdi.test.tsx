// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEMO_USER, profilKelayakan } from '../../data/demo'

// Tes komponen T08: sisi dosen (ringkasan, kuota, kalender) dan prodi (papan, statistik, penguji, CSV).

vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: profilKelayakan }) } } }
})

const { TugasAkhir: Halaman } = await import('./TugasAkhir')
const tampil = (role: typeof DEMO_USER.role) => render(<Halaman user={{ ...DEMO_USER, role }} back={() => {}} go={() => {}} />)
const bagian = async (judul: string) => (await screen.findByRole('heading', { name: judul })).closest('section')!

let unduhan: Blob[] = []
const teks = (b: Blob) => new Promise<string>((ok) => {
  const r = new FileReader()
  r.onload = () => ok(r.result as string)
  r.readAsText(b)
})

beforeEach(() => {
  localStorage.clear()
  unduhan = []
  URL.createObjectURL = vi.fn((b: Blob) => (unduhan.push(b), 'blob:x'))
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})
afterEach(cleanup)

describe('Sisi dosen (demo)', () => {
  it('berlabel demo; ringkasan menandai yang perlu perhatian dan aksi cepat', async () => {
    tampil('DOSEN')
    expect(screen.getByText('Tampilan dosen (demo).')).toBeTruthy()
    const sec = await bagian('Ringkasan bimbingan')
    const li = (await within(sec).findByText(/Optimasi Rute Pengantaran Kantin/)).closest('li')!
    expect(within(li).getByText('Perlu perhatian')).toBeTruthy()
    expect(within(li).getByText('1 entri bimbingan menunggu verifikasi')).toBeTruthy()
    fireEvent.click(within(li).getByRole('button', { name: 'Setujui entri tertua' }))
    expect(await within(sec).findByText(/Entri "Bab 2 Tinjauan Pustaka" disetujui/)).toBeTruthy()
  })

  it('kuota dalam batas aturan; kuota ditutup tidak bisa dipilih mahasiswa', async () => {
    localStorage.setItem('su:ta:penguji-demo', JSON.stringify('dsn-rina'))
    tampil('DOSEN')
    const sec = await bagian('Kuota bimbingan')
    expect(await within(sec).findByText(/4 dari 10 terisi/)).toBeTruthy()
    const isi = (v: string) => {
      fireEvent.change(within(sec).getByLabelText('Kuota baru'), { target: { value: v } })
      fireEvent.click(within(sec).getByRole('button', { name: 'Simpan kuota' }))
    }
    isi('13')
    expect(await within(sec).findByText('Kuota melebihi batas 12 dari aturan prodi.')).toBeTruthy()
    isi('3')
    expect(await within(sec).findByText('Kuota tidak boleh di bawah jumlah mahasiswa yang sedang dibimbing (4).')).toBeTruthy()
    fireEvent.click(within(sec).getByRole('button', { name: 'Tutup kuota' }))
    expect(await within(sec).findByText(/ditutup \(demo\)/)).toBeTruthy()
    cleanup()

    tampil('MAHASISWA')
    expect((await screen.findAllByText(/Dr\. Andi Wijaya, M\.Kom · sisa kuota/)).length).toBeGreaterThan(0)
    expect(screen.queryAllByText(/Rina Kartika, M\.T\. · sisa kuota/)).toHaveLength(0)
  })

  it('kalender menggabungkan bimbingan, penguji, pengawas; bentrok ditandai; ekspor .ics', async () => {
    localStorage.setItem('su:ta:penguji-demo', JSON.stringify('dsn-andi'))
    tampil('DOSEN')
    const sec = await bagian('Kalender saya')
    const agenda = await within(sec).findByRole('list', { name: 'Agenda dosen' })
    expect(within(agenda).getByText('UTS: Pengawasan UTS Basis Data')).toBeTruthy()
    expect(within(agenda).getAllByText('Penguji').length).toBeGreaterThan(0)
    expect(within(sec).getByRole('alert').textContent).toMatch(/1 jadwal bentrok/)
    expect(within(agenda).getByText(/Bentrok dengan Jam bimbingan/)).toBeTruthy()
    fireEvent.click(within(sec).getByRole('button', { name: /Unduh \.ics/ }))
    const ics = await teks(unduhan[0])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('SUMMARY:Pengawas: UTS: Pengawasan UTS Basis Data')
  })
})

describe('Sisi prodi (demo)', () => {
  it('papan agregat tanpa nilai individu, rekap CSV tanpa data pribadi', async () => {
    tampil('TENDIK')
    expect(screen.getByText('Tampilan prodi (demo).')).toBeTruthy()
    const papan = await screen.findByRole('list', { name: 'Jumlah per tahap' })
    expect(within(papan).getByText('Penelitian').previousElementSibling?.textContent).toBe('2')
    const stat = screen.getByRole('list', { name: 'Statistik nilai ujian' })
    expect(within(stat).getByText('rerata 79.5 (n=6)')).toBeTruthy()
    expect(within(stat).getByText('Sidang Akhir').nextElementSibling?.textContent).toBe('disembunyikan (n<5)')
    expect(stat.textContent).not.toMatch(/\b(78|84|82|90)\b/)

    fireEvent.click(screen.getByRole('button', { name: /Unduh rekap CSV/ }))
    const csv = await teks(unduhan[0])
    expect(csv.split('\r\n')[0]).toBe('kode,status,bidang,bimbingan_sah,ujian_berikutnya')
    expect(csv).toContain('ta-angk-4,PENELITIAN,Jaringan & Keamanan,9,')
    expect(csv).not.toMatch(/nim|nama|Andi|Rina/i)
  })

  it('komposisi penguji ditegakkan: pembimbing ditolak, jumlah harus tepat', async () => {
    tampil('TENDIK')
    const li = (await screen.findByText(/Seminar Proposal · Tugas akhir contoh 3/)).closest('li')!
    const simpan = within(li).getByRole('button', { name: 'Simpan penguji' }) as HTMLButtonElement
    expect(simpan.disabled).toBe(false)
    fireEvent.click(within(li).getByLabelText(/^Budi Santoso, M\.Kom/))
    const lang = within(li).getByRole('list', { name: 'Pelanggaran aturan penguji' })
    expect(lang.textContent).toMatch(/memerlukan tepat 2 penguji \(dipilih 3\)/)
    expect(lang.textContent).toMatch(/Budi Santoso, M\.Kom adalah pembimbing mahasiswa ini dan tidak boleh menguji/)
    expect(simpan.disabled).toBe(true)

    fireEvent.click(within(li).getByLabelText(/^Budi Santoso, M\.Kom/))
    fireEvent.click(within(li).getByLabelText(/^Siti Rahma, M\.Cs/))
    fireEvent.click(within(li).getByLabelText(/^Rina Kartika, M\.T\./))
    await waitFor(() => expect(simpan.disabled).toBe(false))
    fireEvent.click(simpan)
    expect(await within(li).findByText('Penguji disimpan (demo).')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('su:ta:penguji-prodi')!)).toEqual({ 'pd-angk-3': ['dsn-andi', 'dsn-rina'] })
  })
})
