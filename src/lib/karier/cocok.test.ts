import { describe, expect, it } from 'vitest'
import { buatLowongan, lamar, laporkan, normalKeahlian, periksaFraud, rekomendasi, skorCocok, urutPelamar, validasiPasang, type InputLowongan, type Orang, type ProfilKerja } from './cocok'

const now = new Date('2026-11-06T03:00:00Z')
const dosen: Orang = { sub: 'D001', nama: 'Dr. Rina', role: 'DOSEN', prodi: 'Teknik Informatika' }
const mhs: Orang = { sub: '231011400001', nama: 'Budi', role: 'MAHASISWA', prodi: 'Teknik Informatika' }
const dasar: InputLowongan = {
  judul: 'Frontend Developer Junior', perusahaan: 'PT Contoh Digital', lokasi: 'Tangerang Selatan', mode: 'HIBRIDA', tipe: 'PENUH_WAKTU', level: 'JUNIOR',
  keahlian: ['React', 'TypeScript', 'CSS'], gajiMin: 6_000_000, gajiMax: 9_000_000,
  deskripsi: 'Membangun antarmuka web. Kualifikasi: React dan TypeScript. Seleksi: tes teknis lalu wawancara.', hariAktif: 30,
}
const profil: ProfilKerja = { keahlian: ['reactjs', 'ts', 'Figma'], level: 'JUNIOR', tipe: ['PENUH_WAKTU'], mode: ['HIBRIDA', 'REMOTE'], lokasi: ['Tangerang'], gajiHarapan: 7_000_000, ringkasan: '' }

describe('karier: pencocokan', () => {
  it('normalisasi alias & duplikat', () => {
    expect(normalKeahlian([' ReactJS ', 'react', 'JS', 'Node'])).toEqual(['react', 'javascript', 'node.js'])
  })

  it('skor transparan: keahlian kurang disebutkan', () => {
    const k = skorCocok(profil, buatLowongan('l1', dasar, dosen, now))
    expect(k.kurang).toEqual(['css'])
    expect(k.skor).toBe(Math.round((2 / 3) * 50 + 15 + 10 + 10 + 10 + 5))
    expect(k.alasan).toContain('2 dari 3 keahlian cocok')
  })

  it('rekomendasi: urut skor, tanpa lowongan sendiri/kedaluwarsa/ditinjau', () => {
    const a = buatLowongan('a', dasar, dosen, now)
    const b = buatLowongan('b', { ...dasar, judul: 'Staf Akuntansi', keahlian: ['akuntansi', 'excel'], mode: 'KANTOR', lokasi: 'Jakarta' }, dosen, now)
    const lama = { ...buatLowongan('c', dasar, dosen, now), kedaluwarsa: '2026-01-01T00:00:00Z' }
    const sendiri = buatLowongan('d', dasar, mhs, now)
    const tinjau = buatLowongan('e', { ...dasar, deskripsi: dasar.deskripsi + ' Wajib transfer dulu biaya pelatihan.' }, dosen, now)
    expect(rekomendasi([b, a, lama, sendiri, tinjau], profil, mhs.sub, now).map((l) => l.id)).toEqual(['a', 'b'])
    expect(rekomendasi([a, b], profil, mhs.sub, now, 'akuntansi').map((l) => l.id)).toEqual(['b'])
  })
})

describe('karier: anti-penipuan', () => {
  it('lowongan bersih = RENDAH dan langsung tayang', () => {
    expect(periksaFraud(dasar)).toEqual({ risiko: 'RENDAH', temuan: [] })
    expect(buatLowongan('x', dasar, dosen, now).status).toBe('AKTIF')
  })

  it('biaya, data sensitif, kontak WA, pemendek URL → TINGGI & ditinjau', () => {
    const r = periksaFraud({ ...dasar, deskripsi: 'Kerja santai. Ada biaya pendaftaran 150rb, kirim foto KTP, hubungi WA 081234567890.', tautan: 'https://bit.ly/abc' })
    expect(r.risiko).toBe('TINGGI')
    expect(r.temuan.length).toBeGreaterThanOrEqual(4)
    expect(buatLowongan('y', { ...dasar, tautan: 'http://contoh.com' }, dosen, now).status).toBe('DITINJAU')
  })

  it('gaji tak wajar saja = SEDANG (tetap tayang, diberi tanda)', () => {
    const r = periksaFraud({ ...dasar, level: 'MAGANG', gajiMax: 25_000_000 })
    expect(r.risiko).toBe('SEDANG')
  })

  it('validasi pasang & batas lowongan aktif', () => {
    expect(validasiPasang(dasar, 0)).toBeNull()
    expect(validasiPasang(dasar, 5)).toMatch(/Maksimal 5/)
    expect(validasiPasang({ ...dasar, deskripsi: 'pendek' }, 0)).toMatch(/Deskripsi/)
  })

  it('laporan unik; tersembunyi di laporan ke-3; pemasang tak bisa melapor', () => {
    let l = buatLowongan('z', dasar, dosen, now)
    l = laporkan(l, dosen.sub)
    l = laporkan(laporkan(l, 'u1'), 'u1')
    expect(l.pelapor).toEqual(['u1'])
    l = laporkan(laporkan(l, 'u2'), 'u3')
    expect(l.status).toBe('DISEMBUNYIKAN')
  })
})

describe('karier: lamaran', () => {
  it('idempoten, tolak lowongan sendiri, pelamar diurut skor', () => {
    const l = buatLowongan('l', dasar, dosen, now)
    expect(lamar([], l, dosen, profil, '', 'x', now)).toMatch(/sendiri/)
    const r1 = lamar([], l, mhs, profil, 'Halo', 'm1', now)
    if (typeof r1 === 'string') throw new Error(r1)
    expect(r1.baru).toBe(true)
    const r2 = lamar([r1.lamaran], l, mhs, profil, 'Lagi', 'm2', now)
    expect(r2).toEqual({ lamaran: r1.lamaran, baru: false })
    const lemah = { ...r1.lamaran, id: 'm3', skor: 20 }
    expect(urutPelamar([lemah, r1.lamaran]).map((x) => x.id)).toEqual(['m1', 'm3'])
  })
})
