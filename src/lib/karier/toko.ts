import {
  buatLowongan, lamar, laporkan, tayang, urutPelamar, validasiPasang,
  type InputLowongan, type Lamaran, type Lowongan, type Orang, type ProfilKerja, type StatusLamaran,
} from './cocok.js'

// Operasi data karier di atas satu state. Dipakai mode demo (localStorage) dan BFF (memori, TODO(BFF): DB)
// sehingga aturan akses sama persis di kedua sisi. Galat = GalatKarier dengan kode HTTP.

export interface StateKarier {
  lowongan: Lowongan[]
  lamaran: Lamaran[]
  profil: Record<string, ProfilKerja>
}

export class GalatKarier extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const moderator = (o: Orang) => o.role === 'TENDIK' // TODO(BFF-AUTHZ): peran moderator CDC/karier, bukan semua tendik.
const ambil = (s: StateKarier, id: string) => s.lowongan.find((l) => l.id === id) ?? fail(404, 'Lowongan tidak ditemukan.')
function fail(status: number, pesan: string): never {
  throw new GalatKarier(status, pesan)
}
const ganti = (s: StateKarier, l: Lowongan) => (s.lowongan = s.lowongan.map((x) => (x.id === l.id ? l : x)), l)

/** Yang boleh dilihat: lowongan tayang, milik sendiri (status apa pun), dan antrean moderasi untuk moderator. */
export function lihatLowongan(s: StateKarier, aku: Orang, now: Date): Lowongan[] {
  return s.lowongan
    .filter((l) => tayang(l, now) || l.pemasang.sub === aku.sub || (moderator(aku) && (l.status === 'DITINJAU' || l.status === 'DISEMBUNYIKAN')))
    .map((l) => (l.pemasang.sub === aku.sub || moderator(aku) ? l : { ...l, pelapor: [] }))
}

export function pasang(s: StateKarier, aku: Orang, input: InputLowongan, id: string, now: Date): Lowongan {
  const aktif = s.lowongan.filter((l) => l.pemasang.sub === aku.sub && (l.status === 'AKTIF' || l.status === 'DITINJAU') && Date.parse(l.kedaluwarsa) > now.getTime()).length
  const galat = validasiPasang(input, aktif)
  if (galat) fail(400, galat)
  const l = buatLowongan(id, input, aku, now)
  s.lowongan = [l, ...s.lowongan]
  return l
}

export function tutup(s: StateKarier, aku: Orang, id: string): Lowongan {
  const l = ambil(s, id)
  if (l.pemasang.sub !== aku.sub) fail(403, 'Hanya pemasang yang bisa menutup lowongan.')
  return ganti(s, { ...l, status: 'DITUTUP' })
}

export function lapor(s: StateKarier, aku: Orang, id: string): Lowongan {
  return ganti(s, laporkan(ambil(s, id), aku.sub))
}

export function moderasi(s: StateKarier, aku: Orang, id: string, setuju: boolean): Lowongan {
  if (!moderator(aku)) fail(403, 'Hanya moderator yang bisa meninjau lowongan.')
  const l = ambil(s, id)
  return ganti(s, { ...l, status: setuju ? 'AKTIF' : 'DITOLAK', pelapor: setuju ? [] : l.pelapor })
}

export function kirimLamaran(s: StateKarier, aku: Orang, id: string, pesan: string, idBaru: string, now: Date) {
  const profil = s.profil[aku.sub]
  if (!profil?.keahlian.length) fail(400, 'Lengkapi profil kerja (minimal keahlian) sebelum melamar.')
  const r = lamar(s.lamaran, ambil(s, id), aku, profil, pesan, idBaru, now)
  if (typeof r === 'string') fail(409, r)
  if (r.baru) s.lamaran = [r.lamaran, ...s.lamaran]
  return r
}

export const lamaranSaya = (s: StateKarier, aku: Orang) => s.lamaran.filter((x) => x.pelamar.sub === aku.sub)

/** Pemasang melihat pelamar (urut skor); lamaran TERKIRIM otomatis menjadi DILIHAT. */
export function pelamar(s: StateKarier, aku: Orang, id: string): Lamaran[] {
  if (ambil(s, id).pemasang.sub !== aku.sub) fail(403, 'Hanya pemasang yang bisa melihat pelamar.')
  s.lamaran = s.lamaran.map((x) => (x.lowonganId === id && x.status === 'TERKIRIM' ? { ...x, status: 'DILIHAT' } : x))
  return urutPelamar(s.lamaran.filter((x) => x.lowonganId === id))
}

export function ubahStatus(s: StateKarier, aku: Orang, lamaranId: string, status: StatusLamaran): Lamaran {
  const x = s.lamaran.find((a) => a.id === lamaranId) ?? fail(404, 'Lamaran tidak ditemukan.')
  if (ambil(s, x.lowonganId).pemasang.sub !== aku.sub) fail(403, 'Hanya pemasang yang bisa mengubah status lamaran.')
  const baru = { ...x, status }
  s.lamaran = s.lamaran.map((a) => (a.id === lamaranId ? baru : a))
  return baru
}
