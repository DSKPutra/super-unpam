// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ATURAN_BAWAAN } from '../../data/aturan-akademik'
import { DEMO_USER, profilKelayakan } from '../../data/demo'
import { sha256Hex } from '../../lib/akademik/logbook'
import type { DataPenilaian, PendaftaranUjianAkhir, TugasAkhir } from '../../lib/akademik/types'
import { LOGBOOK_DEMO_KEY, PENILAIAN_DEMO_KEY, TA_DEMO_KEY, UJIAN_AKHIR_DEMO_KEY } from '../../lib/sumber/ta'

// Tes komponen T07 (revisi, pengesahan, naskah final, plagiasi, administrasi, wisuda, selesai).

vi.mock('../../lib/sumber', async (orig) => {
  const asli = await orig<typeof import('../../lib/sumber')>()
  return { ...asli, sumber: { ...asli.sumber, ujian: { ...asli.sumber.ujian, kelayakan: async () => ({ asal: 'contoh', data: profilKelayakan }) } } }
})

const { TugasAkhir: Halaman } = await import('./TugasAkhir')
const tampil = (role: typeof DEMO_USER.role = 'MAHASISWA') => render(<Halaman user={{ ...DEMO_USER, role }} back={() => {}} go={() => {}} />)

const sesi = { id: 'pd-uji:sp', jenis: 'PROPOSAL' as const, kode: 'ta-uji', nama: 'PROPOSAL', mulai: '2026-10-20T02:00:00.000Z', selesai: '2026-10-20T04:00:00.000Z', ruang: 'R. Sidang 1', petugas: ['dsn-andi', 'dsn-hadi'] }
const ta = (status: TugasAkhir['status']): TugasAkhir => ({ id: 'ta-uji', judul: 'Judul Uji Finalisasi', abstrak: 'a', bidang: 'Rekayasa Perangkat Lunak', metode: 'm', pilihanPembimbing: ['dsn-siti'], pembimbing: ['dsn-siti'], status, riwayat: [], perubahan: [] })
const pd: PendaftaranUjianAkhir = { id: 'pd-uji', tugasAkhirId: 'ta-uji', jenis: 'PROPOSAL', status: 'SELESAI', berkas: [], riwayat: [], sesi }
const nilai: DataPenilaian = {
  pendaftaranId: 'pd-uji', lembar: [], audit: [],
  hasil: {
    keputusan: 'LULUS_REVISI', dirilis: new Date().toISOString(),
    revisi: [
      { id: 'pd-uji:dsn-andi:1', bagian: 'Bab 2', permintaan: 'Tambah kajian pustaka', pengujiId: 'dsn-andi', status: 'BELUM' },
      { id: 'pd-uji:dsn-hadi:1', bagian: 'Bab 3', permintaan: 'Perjelas metode', pengujiId: 'dsn-hadi', status: 'BELUM' },
    ],
  },
}

function siapkan(status: TugasAkhir['status']) {
  localStorage.clear()
  localStorage.setItem(TA_DEMO_KEY, JSON.stringify({ milikSaya: ta(status), antrian: null }))
  localStorage.setItem(UJIAN_AKHIR_DEMO_KEY, JSON.stringify({ pendaftaran: [pd], terisi: {} }))
  localStorage.setItem(PENILAIAN_DEMO_KEY, JSON.stringify({ 'pd-uji': nilai }))
  localStorage.setItem(LOGBOOK_DEMO_KEY, JSON.stringify({ 'ta-uji': { tugasAkhirId: 'ta-uji', entri: [], versi: [{ versi: 1, nama: 'draf-revisi.pdf', ukuran: 1, tipe: 'application/pdf', sha256: 'a'.repeat(64), catatan: 'r', diunggah: new Date().toISOString() }] } }))
}

const butir = (bagian: string) => within(screen.getByRole('list', { name: 'Butir revisi pasca ujian' })).getByText(bagian).closest('li')!

async function ajukanPerbaikan(bagian: string) {
  await screen.findByRole('list', { name: 'Butir revisi pasca ujian' })
  const li = butir(bagian)
  fireEvent.click(within(li).getByRole('button', { name: 'Ajukan perbaikan' }))
  fireEvent.change(within(li).getByLabelText('Versi draf yang memuat perbaikan'), { target: { value: '1' } })
  fireEvent.change(within(li).getByLabelText('Penjelasan perbaikan'), { target: { value: 'Sudah diperbaiki' } })
  fireEvent.click(within(li).getByRole('button', { name: 'Kirim ke penguji' }))
  await screen.findByText(/Perbaikan diajukan ke penguji/)
}

async function setujuiSebagai(penguji: string) {
  cleanup()
  localStorage.setItem('su:ta:penguji-demo', JSON.stringify(penguji))
  tampil('DOSEN')
  const sec = (await screen.findByRole('heading', { name: 'Revisi menunggu keputusan saya' })).closest('section')!
  fireEvent.click(await within(sec).findByRole('button', { name: 'Setujui butir' }))
  await within(sec).findByText(/Butir revisi disetujui/)
  cleanup()
  tampil()
}

afterEach(cleanup)

describe('Revisi pasca ujian', () => {
  beforeEach(() => siapkan('REVISI_PROPOSAL'))

  it('lembar pengesahan terkunci selama ada revisi terbuka; perbaikan wajib menunjuk versi draf', async () => {
    tampil()
    expect(await screen.findByText('0 dari 2 butir disetujui')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Cetak lembar pengesahan/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Masih ada 2 butir revisi yang belum disetujui.')).toBeTruthy()
    const li = butir('Bab 2')
    fireEvent.click(within(li).getByRole('button', { name: 'Ajukan perbaikan' }))
    fireEvent.change(within(li).getByLabelText('Penjelasan perbaikan'), { target: { value: 'x' } })
    fireEvent.click(within(li).getByRole('button', { name: 'Kirim ke penguji' }))
    expect(await screen.findByText('Pilih versi draf yang memuat perbaikan.')).toBeTruthy()
  })

  it('semua butir disetujui penguji masing-masing → pengesahan terbuka, alur TA lanjut', async () => {
    tampil()
    await ajukanPerbaikan('Bab 2')
    await ajukanPerbaikan('Bab 3')
    expect(within(butir('Bab 2')).getByText('Menunggu penguji')).toBeTruthy()
    await setujuiSebagai('dsn-andi')
    expect(await screen.findByText('1 dari 2 butir disetujui')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Cetak lembar pengesahan/ }) as HTMLButtonElement).disabled).toBe(true)
    await setujuiSebagai('dsn-hadi')
    expect(await screen.findByText('2 dari 2 butir disetujui')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Cetak lembar pengesahan/ }) as HTMLButtonElement).disabled).toBe(false)
    expect(document.querySelector('.print-doc[data-doc="pengesahan:ta-uji"]')?.textContent).toContain('MENUNGGU TANDA TANGAN RESMI')
    await waitFor(() => expect(screen.getByRole('list', { name: 'Tahap saat ini: Penelitian' })).toBeTruthy())
  })
})

/** Isi berkas yang hasil penyedia contoh-nya di bawah ambang (penyedia demo deterministik dari hash). */
async function isiLolos() {
  for (let i = 0; ; i++) {
    const isi = `naskah final ${i}`
    const h = await sha256Hex(new TextEncoder().encode(isi).buffer as ArrayBuffer)
    if (parseInt(h.slice(0, 2), 16) % 30 <= ATURAN_BAWAAN.plagiasi.ambangPersen) return isi
  }
}

describe('Finalisasi & administrasi lulus', () => {
  beforeEach(() => {
    siapkan('YUDISIUM')
    // Revisi sudah selesai di tahap sebelumnya.
    localStorage.setItem(PENILAIAN_DEMO_KEY, JSON.stringify({ 'pd-uji': { ...nilai, hasil: { ...nilai.hasil!, revisi: nilai.hasil!.revisi.map((r) => ({ ...r, status: 'DISETUJUI' })) } } }))
  })

  it('naskah final, kemiripan, checklist, wisuda, sampai selesai', async () => {
    tampil()
    const daftar = await screen.findByRole('button', { name: 'Daftar wisuda' })
    expect((daftar as HTMLButtonElement).disabled).toBe(true)
    const kurang = screen.getByRole('list', { name: 'Yang masih kurang untuk lulus' })
    expect(kurang.textContent).toMatch(/Naskah final belum diunggah/)
    expect((screen.getByRole('button', { name: 'Periksa kemiripan' }) as HTMLButtonElement).disabled).toBe(true)

    // Daftar periksa belum lengkap → ditolak.
    fireEvent.change(screen.getByLabelText(/Unggah naskah final/), { target: { files: [new File([await isiLolos()], 'final.pdf', { type: 'application/pdf' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan naskah final' }))
    expect(await screen.findByText(/Daftar periksa belum lengkap/)).toBeTruthy()
    for (const d of ATURAN_BAWAAN.naskahFinal.daftarPeriksa) fireEvent.click(screen.getByLabelText(d))
    fireEvent.click(screen.getByLabelText(/^Terbuka/))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan naskah final' }))
    expect(await screen.findByText(/SHA-256 [0-9a-f]{64}/)).toBeTruthy()

    const periksa = screen.getByRole('button', { name: 'Periksa kemiripan' }) as HTMLButtonElement
    await waitFor(() => expect(periksa.disabled).toBe(false))
    fireEvent.click(periksa)
    expect(await screen.findByText(/hasil contoh, bukan pemeriksaan sungguhan/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Bebas pustaka' }))
    await screen.findByText(/Bebas pustaka diajukan/)
    expect((screen.getByRole('button', { name: 'Daftar wisuda' }) as HTMLButtonElement).disabled).toBe(true)

    // Simulasi prodi menandai semua item selesai.
    cleanup()
    tampil('DOSEN')
    const sec = (await screen.findByRole('heading', { name: 'Simulasi prodi (demo)' })).closest('section')!
    for (const item of ATURAN_BAWAAN.adminLulus.item) {
      fireEvent.click(await within(sec).findByRole('button', { name: `Tandai selesai ${item.label}` }))
      await within(sec).findByText(new RegExp(`${item.label.replace(/[()]/g, '.')} ditandai selesai`))
    }
    cleanup()

    tampil()
    const tombol = await screen.findByRole('button', { name: 'Daftar wisuda' })
    await waitFor(() => expect((tombol as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(tombol)
    expect(await screen.findByText(/Terdaftar wisuda sejak/)).toBeTruthy()
    cleanup()

    tampil('DOSEN')
    const sec2 = (await screen.findByRole('heading', { name: 'Simulasi prodi (demo)' })).closest('section')!
    fireEvent.click(within(sec2).getByRole('button', { name: 'Nyatakan selesai' }))
    await within(sec2).findByText(/dinyatakan selesai/)
    cleanup()

    tampil()
    expect(await screen.findByText(/Tugas akhir selesai\. Selamat!/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Alumni' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tracer Study' })).toBeTruthy()
  })
})
