import { request } from '../api'
import type { DariSumber } from '../types'
import { buatLowongan, type InputLowongan, type Lamaran, type Lowongan, type Orang, type ProfilKerja, type StatusLamaran } from '../karier/cocok'
import * as toko from '../karier/toko'

/** Sumber data Karier & Lowongan. Identitas pemegang sesi ditentukan server; `masuk` hanya untuk mode demo. */
export interface SumberKarier {
  masuk(aku: Orang): void
  lowongan(): Promise<DariSumber<Lowongan[]>>
  profil(): Promise<DariSumber<ProfilKerja | null>>
  simpanProfil(p: ProfilKerja): Promise<DariSumber<ProfilKerja>>
  pasang(input: InputLowongan): Promise<DariSumber<Lowongan>>
  tutup(id: string): Promise<DariSumber<Lowongan>>
  lapor(id: string): Promise<DariSumber<Lowongan>>
  moderasi(id: string, setuju: boolean): Promise<DariSumber<Lowongan>>
  lamar(id: string, pesan: string): Promise<DariSumber<{ lamaran: Lamaran; baru: boolean }>>
  lamaranSaya(): Promise<DariSumber<Lamaran[]>>
  pelamar(id: string): Promise<DariSumber<Lamaran[]>>
  ubahStatus(lamaranId: string, status: StatusLamaran): Promise<DariSumber<Lamaran>>
}

const KUNCI = 'su:karier:data'
const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })
const idAcak = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function benih(now: Date): toko.StateKarier {
  const o = (sub: string, nama: string, role: Orang['role'], prodi: string): Orang => ({ sub, nama, role, prodi })
  const isi = (x: Partial<InputLowongan> & Pick<InputLowongan, 'judul' | 'perusahaan' | 'keahlian'>): InputLowongan => ({
    lokasi: 'Tangerang Selatan', mode: 'HIBRIDA', tipe: 'PENUH_WAKTU', level: 'JUNIOR', hariAktif: 30,
    deskripsi: 'Tanggung jawab dan kualifikasi dijelaskan saat wawancara. Seleksi: CV, tes, wawancara. Tidak ada biaya apa pun.', ...x,
  })
  const l = [
    buatLowongan('lw-1', isi({ judul: 'Magang Frontend Developer', perusahaan: 'Startup edutech (alumni TI 2017)', mode: 'REMOTE', tipe: 'MAGANG', level: 'MAGANG', keahlian: ['react', 'typescript', 'git'], gajiMin: 2_000_000, gajiMax: 3_500_000 }), o('A2017001', 'Rizky Pratama', 'ALUMNI', 'Teknik Informatika'), now),
    buatLowongan('lw-2', isi({ judul: 'Staf Akuntansi', perusahaan: 'KAP mitra alumni', lokasi: 'Jakarta Selatan', mode: 'KANTOR', keahlian: ['akuntansi', 'excel', 'perpajakan'], gajiMin: 5_500_000, gajiMax: 7_000_000 }), o('A2016002', 'Nadia Putri', 'ALUMNI', 'Akuntansi'), now),
    buatLowongan('lw-3', isi({ judul: 'Asisten Peneliti Data (Hibah Dikti)', perusahaan: 'Lab Data Science FT UNPAM', tipe: 'KONTRAK', level: 'MAGANG', keahlian: ['python', 'sql', 'statistik'], gajiMin: 2_500_000, gajiMax: 3_000_000, hariAktif: 21 }), o('D0410001', 'Dr. Rina Kartika', 'DOSEN', 'Teknik Informatika'), now),
    buatLowongan('lw-4', isi({ judul: 'Desainer Grafis Freelance', perusahaan: 'UMKM kopi milik mahasiswa', lokasi: 'Pamulang', mode: 'REMOTE', tipe: 'FREELANCE', keahlian: ['figma', 'ilustrasi', 'canva'] }), o('231012500077', 'Fajar Nugroho', 'MAHASISWA', 'Manajemen'), now),
    buatLowongan('lw-5', isi({ judul: 'Admin Layanan Akademik (PKWT)', perusahaan: 'Biro Administrasi UNPAM', lokasi: 'Pamulang', mode: 'KANTOR', tipe: 'KONTRAK', keahlian: ['excel', 'komunikasi', 'administrasi'], gajiMin: 4_800_000, gajiMax: 5_200_000 }), o('T0099001', 'Bagian SDM', 'TENDIK', 'Biro SDM'), now),
    buatLowongan('lw-6', isi({ judul: 'KERJA ONLINE GAJI HARIAN', perusahaan: 'Agensi digital', mode: 'REMOTE', keahlian: ['komunikasi'], deskripsi: 'Kerja santai dari HP, cukup tugas like dan share. Ada biaya pendaftaran 100rb, hubungi WA 081234567890.' }), o('231019900001', 'Akun Baru', 'MAHASISWA', 'Manajemen'), now),
  ]
  return { lowongan: l, lamaran: [], profil: {} }
}

let aku: Orang = { sub: 'demo', nama: 'Pengguna demo', role: 'MAHASISWA', prodi: '-' }
function muat(): toko.StateKarier {
  try {
    const raw = localStorage.getItem(KUNCI)
    if (raw) return JSON.parse(raw) as toko.StateKarier
  } catch {
    /* rusak atau tidak tersedia: mulai ulang dari benih */
  }
  return benih(new Date())
}
/** Jalankan operasi toko atas state demo lalu simpan. Galat toko diteruskan sebagai Error biasa. */
async function ops<T>(fn: (s: toko.StateKarier) => T): Promise<DariSumber<T>> {
  const s = muat()
  const hasil = fn(s)
  try {
    localStorage.setItem(KUNCI, JSON.stringify(s))
  } catch {
    /* penyimpanan penuh/diblokir: hasil tetap dikembalikan */
  }
  return contoh(hasil)
}

/** Mode demo: semua data di perangkat ini, tidak dikirim ke mana pun. */
export const karierDemo: SumberKarier = {
  masuk: (o) => void (aku = o),
  lowongan: () => ops((s) => toko.lihatLowongan(s, aku, new Date())),
  profil: () => ops((s) => s.profil[aku.sub] ?? null),
  simpanProfil: (p) => ops((s) => (s.profil[aku.sub] = p)),
  pasang: (input) => ops((s) => toko.pasang(s, aku, input, idAcak('lw'), new Date())),
  tutup: (id) => ops((s) => toko.tutup(s, aku, id)),
  lapor: (id) => ops((s) => toko.lapor(s, aku, id)),
  moderasi: (id, setuju) => ops((s) => toko.moderasi(s, aku, id, setuju)),
  lamar: (id, pesan) => ops((s) => toko.kirimLamaran(s, aku, id, pesan, idAcak('lm'), new Date())),
  lamaranSaya: () => ops((s) => toko.lamaranSaya(s, aku)),
  pelamar: (id) => ops((s) => toko.pelamar(s, aku, id)),
  ubahStatus: (lamaranId, status) => ops((s) => toko.ubahStatus(s, aku, lamaranId, status)),
}

const post = <T>(path: string, body: unknown) => request<DariSumber<T>>(`karier/${path}`, { method: 'POST', body: JSON.stringify(body) })

/** BFF: /api/karier/* (api/karier/[action].ts). Identitas & peran diambil dari sesi, bukan dari klien. */
export const karierHttp: SumberKarier = {
  masuk: () => {},
  lowongan: () => request('karier/lowongan'),
  profil: () => request('karier/profil'),
  simpanProfil: (p) => post('profil', p),
  pasang: (input) => post('pasang', input),
  tutup: (id) => post('tutup', { id }),
  lapor: (id) => post('lapor', { id }),
  moderasi: (id, setuju) => post('moderasi', { id, setuju }),
  lamar: (id, pesan) => post('lamar', { id, pesan }),
  lamaranSaya: () => request('karier/lamaran'),
  pelamar: (id) => request(`karier/pelamar?id=${encodeURIComponent(id)}`),
  ubahStatus: (lamaranId, status) => post('status', { lamaranId, status }),
}
