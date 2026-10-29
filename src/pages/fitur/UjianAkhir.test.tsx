// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DEMO_USER, profilKelayakan } from '../../data/demo'
import type { Bimbingan, ProfilKelayakan, TugasAkhir } from '../../lib/akademik/types'
import { LOGBOOK_DEMO_KEY, TA_DEMO_KEY } from '../../lib/sumber/ta'

// Tes komponen pendaftaran ujian akhir (T05) dengan sumber demo asli.

const state: { profil: ProfilKelayakan } = { profil: profilKelayakan }
vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: state.profil }) } } }
})

const { TugasAkhir: Halaman } = await import('./TugasAkhir')
const tampil = (role: typeof DEMO_USER.role = 'MAHASISWA') => render(<Halaman user={{ ...DEMO_USER, role }} back={() => {}} go={() => {}} />)

const ta: TugasAkhir = {
  id: 'ta-uji', judul: 'Judul Uji Ujian Akhir', abstrak: 'a', bidang: 'Rekayasa Perangkat Lunak', metode: 'm',
  pilihanPembimbing: ['dsn-siti'], pembimbing: ['dsn-siti'], status: 'BIMBINGAN',
  riwayat: [{ dari: 'DISETUJUI_PEMBIMBING', ke: 'BIMBINGAN', peristiwa: 'MULAI_BIMBINGAN', pelaku: 'MAHASISWA', waktu: new Date().toISOString() }],
  perubahan: [],
}
const entri = (n: number): Bimbingan[] => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, tugasAkhirId: ta.id, tanggal: new Date(Date.now() - (i + 1) * 86_400_000).toISOString(), bagian: `Bab ${i + 1}`, ringkasan: 'Ringkasan arahan yang cukup panjang', status: 'DISETUJUI' }))

function siapkan(sah: number) {
  localStorage.clear()
  localStorage.setItem(TA_DEMO_KEY, JSON.stringify({ milikSaya: ta, antrian: null }))
  localStorage.setItem(LOGBOOK_DEMO_KEY, JSON.stringify({ [ta.id]: { tugasAkhirId: ta.id, entri: entri(sah), versi: [] } }))
}

async function unggah(label: string, isi: string) {
  const f = new File([isi], `${label}.pdf`, { type: 'application/pdf' })
  fireEvent.change(await screen.findByLabelText(`Unggah ${label}`), { target: { files: [f] } })
  await screen.findByText(new RegExp(`${label}\\.pdf · SHA-256`))
}

async function mulaiDanUnggahWajib() {
  fireEvent.click(await screen.findByRole('button', { name: 'Mulai pendaftaran Seminar Proposal' }))
  await screen.findByText(/Syarat Seminar Proposal/)
  await unggah('Naskah proposal', 'isi naskah')
  await unggah('Lembar persetujuan pembimbing', 'isi lembar')
}

async function sebagaiDosen(fn: (kartu: HTMLElement) => Promise<void> | void) {
  cleanup()
  tampil('DOSEN')
  const kartu = (await screen.findAllByText('Judul Uji Ujian Akhir')).map((e) => e.closest('li')!).find((li) => within(li).queryByText('Seminar Proposal'))!
  await fn(kartu)
  cleanup()
  tampil()
}

beforeEach(() => {
  state.profil = profilKelayakan
  siapkan(4)
})
afterEach(cleanup)

describe('Pendaftaran ujian akhir', () => {
  it('ajukan ke pembimbing nonaktif sampai berkas wajib diunggah; yang kurang disebut', async () => {
    tampil()
    fireEvent.click(await screen.findByRole('button', { name: 'Mulai pendaftaran Seminar Proposal' }))
    const kurang = await screen.findByRole('list', { name: 'Yang masih kurang' })
    expect(kurang.textContent).toMatch(/Naskah proposal belum diunggah/)
    expect((screen.getByRole('button', { name: 'Ajukan ke pembimbing' }) as HTMLButtonElement).disabled).toBe(true)
    await unggah('Naskah proposal', 'isi naskah')
    await unggah('Lembar persetujuan pembimbing', 'isi lembar')
    expect((screen.getByRole('button', { name: 'Ajukan ke pembimbing' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('bimbingan sah kurang dari minimum → tidak bisa diajukan', async () => {
    siapkan(3)
    tampil()
    await mulaiDanUnggahWajib()
    expect(screen.getByRole('list', { name: 'Yang masih kurang' }).textContent).toMatch(/3 dari 4 bimbingan disetujui/)
    expect((screen.getByRole('button', { name: 'Ajukan ke pembimbing' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('dosen mengembalikan → kembali ke persiapan berkas dengan alasan', async () => {
    tampil()
    await mulaiDanUnggahWajib()
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan ke pembimbing' }))
    await screen.findByText(/Menunggu pembimbing memeriksa berkas/)
    await sebagaiDosen(async (kartu) => {
      fireEvent.change(within(kartu).getByLabelText('Alasan mengembalikan pendaftaran'), { target: { value: 'Lembar persetujuan belum ditandatangani' } })
      fireEvent.click(within(kartu).getByRole('button', { name: 'Kembalikan' }))
      await screen.findByText(/dikembalikan ke mahasiswa/)
    })
    expect(await screen.findByText(/Dikembalikan pembimbing: Lembar persetujuan belum ditandatangani/)).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Tahap pendaftaran: Persiapan berkas' })).toBeTruthy()
  })

  it('alur lengkap: verifikasi berkas → disetujui → slot (bentrok/penuh ditolak) → terjadwal + alur TA ikut', async () => {
    tampil()
    await mulaiDanUnggahWajib()
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan ke pembimbing' }))
    await screen.findByText(/Menunggu pembimbing memeriksa berkas/)

    await sebagaiDosen(async (kartu) => {
      expect((within(kartu).getByRole('button', { name: 'Setujui pendaftaran' }) as HTMLButtonElement).disabled).toBe(true)
      for (const _ of [0, 1]) {
        fireEvent.click(within(kartu).getAllByRole('button', { name: 'Verifikasi' })[0])
        await screen.findByText(/Berkas diverifikasi/)
      }
      await waitFor(() => expect((within(kartu).getByRole('button', { name: 'Setujui pendaftaran' }) as HTMLButtonElement).disabled).toBe(false))
      fireEvent.click(within(kartu).getByRole('button', { name: 'Setujui pendaftaran' }))
      await screen.findByText(/diteruskan ke prodi/)
    })

    expect(await screen.findByText('Pilih jadwal dari prodi')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Tahap saat ini: Layak proposal' })).toBeTruthy()
    expect(screen.getByText(/Bentrok dengan jadwal Anda: Pemrograman Web/)).toBeTruthy()
    expect(screen.getByText('Slot sudah penuh.')).toBeTruthy()
    expect(screen.getByText(/Penguji pada slot ini sudah memiliki jadwal lain/)).toBeTruthy()
    const pilih = screen.getAllByRole('button', { name: /^Pilih slot/ })
    expect(pilih.filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(1)
    fireEvent.click(pilih.find((b) => !(b as HTMLButtonElement).disabled)!)

    expect(await screen.findByText('Persiapan Seminar Proposal')).toBeTruthy()
    expect(screen.getByText(/R\. Sidang 1/)).toBeTruthy()
    expect(screen.getByText(/hari \d+ jam lagi/)).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('list', { name: 'Tahap saat ini: Seminar proposal' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Jadwal ulang' })).toBeTruthy()
  })
})
