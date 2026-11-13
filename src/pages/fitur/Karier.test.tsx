// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { User } from '../../lib/types'
import { Karier } from './Karier'

const mhs: User = { name: 'Budi Santoso', nim: '231011400001', role: 'MAHASISWA', prodi: 'Teknik Informatika', fakultas: 'FT', angkatan: '2023' }
const tendik: User = { ...mhs, name: 'Moderator CDC', nim: 'T0001', role: 'TENDIK', prodi: 'CDC' }
const tab = (n: string) => fireEvent.click(screen.getByRole('tab', { name: n }))
const isi = (label: RegExp, v: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } })

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('Karier & Lowongan', () => {
  it('lowongan dari berbagai peran tampil; lowongan penipuan ditahan; profil mengurutkan & lamar', async () => {
    render(<Karier user={mhs} back={() => {}} />)
    expect(await screen.findByText('Magang Frontend Developer')).toBeTruthy()
    expect(screen.getByText(/Rizky Pratama · Alumni/)).toBeTruthy()
    expect(screen.getByText(/Dr. Rina Kartika · Dosen/)).toBeTruthy()
    expect(screen.queryByText('KERJA ONLINE GAJI HARIAN')).toBeNull()

    tab('Profil')
    isi(/Keahlian \(pisahkan/, 'React, TypeScript, Git')
    fireEvent.click(screen.getByText('Simpan profil'))
    const kartu = (await screen.findAllByRole('listitem')).filter((li) => li.querySelector('.font-semibold')?.textContent?.length)
    expect(within(kartu[0]).getByText('Magang Frontend Developer')).toBeTruthy()
    expect(within(kartu[0]).getByText(/% cocok/)).toBeTruthy()

    fireEvent.click(within(kartu[0]).getByText('Detail & lamar'))
    fireEvent.click(within(kartu[0]).getByText('Kirim lamaran'))
    expect(await within(kartu[0]).findByText('Lamaran terkirim beserta profil kerja Anda.')).toBeTruthy()
    tab('Aktivitas')
    expect(await screen.findByText('Terkirim')).toBeTruthy()
  })

  it('siapa pun boleh memasang; isi mencurigakan ditahan untuk moderator lalu disetujui', async () => {
    render(<Karier user={mhs} back={() => {}} />)
    await screen.findByText('Magang Frontend Developer')
    tab('Pasang')
    isi(/^Posisi/, 'Barista paruh waktu')
    isi(/Perusahaan/, 'Kedai kopi')
    isi(/^Lokasi/, 'Pamulang')
    isi(/Keahlian dibutuhkan/, 'kopi, pelayanan')
    isi(/Deskripsi/, 'Melayani pelanggan di kedai. Wajib bayar biaya pendaftaran seragam terlebih dahulu sebelum mulai.')
    expect(screen.getByText(/akan ditahan untuk ditinjau moderator/)).toBeTruthy()
    fireEvent.click(screen.getByText('Pasang lowongan'))
    expect(await screen.findByText('Ditinjau moderator')).toBeTruthy()
    cleanup()

    render(<Karier user={tendik} back={() => {}} />)
    await screen.findByText('Magang Frontend Developer')
    tab('Moderasi')
    const item = (await screen.findByText('Barista paruh waktu')).closest('li')!
    expect(within(item).getByText(/Meminta pelamar membayar/)).toBeTruthy()
    expect(screen.getByText('KERJA ONLINE GAJI HARIAN')).toBeTruthy()
    fireEvent.click(within(item).getByText('Setujui tayang'))
    tab('Cari')
    expect(await screen.findByText('Barista paruh waktu')).toBeTruthy()
  })
})
