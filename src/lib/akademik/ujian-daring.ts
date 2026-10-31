import type { AturanProdi } from '../../data/aturan-akademik.js'

// Ujian daring bentuk paling sederhana (T09): soal dirilis saat jam mulai, unggahan jawaban ditutup
// pada jam selesai (+ perpanjangan akomodasi + toleransi sambungan). Waktu resmi SELALU dari server;
// hitung mundur di klien hanya tampilan. Pengiriman idempoten lewat kunci dari klien.
// Tidak ada perekaman perangkat dan tidak ada deteksi "kecurangan" otomatis.

export interface SesiDaring {
  id: string
  kodeMK: string
  namaMK: string
  jenis: 'UTS' | 'UAS'
  mulai: string
  selesai: string
  /** Perpanjangan akomodasi (menit) untuk pemegang sesi; ditetapkan server/BAAK, bukan klien. */
  perpanjanganMenit: number
  /** Hanya dikirim server setelah ujian dimulai. */
  soal?: { nama: string; url: string }
}

export interface KirimanJawaban {
  /** Kunci idempotensi dari klien: kirim ulang dengan kunci sama tidak menggandakan kiriman. */
  kunci: string
  nama: string
  ukuran: number
  tipe: string
  sha256: string
  versi: number
  /** Waktu SERVER saat kiriman diterima (struk). */
  diterima: string
}

export type Fase = 'BELUM' | 'BERLANGSUNG' | 'TOLERANSI' | 'DITUTUP'

type AturanDaring = Pick<AturanProdi, 'ujianDaring'>
const MENIT = 60_000

/** Batas akhir efektif: selesai + perpanjangan (dibatasi aturan). */
export const selesaiEfektif = (s: SesiDaring, aturan: AturanDaring) =>
  Date.parse(s.selesai) + Math.min(Math.max(0, s.perpanjanganMenit), aturan.ujianDaring.maksPerpanjanganMenit) * MENIT

export function fase(s: SesiDaring, nowServer: number, aturan: AturanDaring): { fase: Fase; sisaMs: number } {
  const mulai = Date.parse(s.mulai)
  const akhir = selesaiEfektif(s, aturan)
  if (nowServer < mulai) return { fase: 'BELUM', sisaMs: mulai - nowServer }
  if (nowServer < akhir) return { fase: 'BERLANGSUNG', sisaMs: akhir - nowServer }
  const tol = akhir + aturan.ujianDaring.toleransiDetik * 1000
  if (nowServer < tol) return { fase: 'TOLERANSI', sisaMs: tol - nowServer }
  return { fase: 'DITUTUP', sisaMs: 0 }
}

/** Selisih jam server − jam klien, dari titik tengah waktu tempuh permintaan. */
export const offsetServer = (serverNowIso: string, klienSebelum: number, klienSesudah: number) =>
  Date.parse(serverNowIso) - Math.round((klienSebelum + klienSesudah) / 2)

export interface BerkasJawaban {
  kunci: string
  nama: string
  ukuran: number
  tipe: string
  sha256: string
}

export type HasilKirim = { ok: true; kiriman: KirimanJawaban; daftar: KirimanJawaban[]; baru: boolean } | { ok: false; galat: string }

/** Terima kiriman jawaban. Kunci sama + berkas sama → kiriman lama dikembalikan (idempoten). */
export function terimaKiriman(daftar: KirimanJawaban[], b: BerkasJawaban, s: SesiDaring, nowServer: number, aturan: AturanDaring): HasilKirim {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(b.kunci)) return { ok: false, galat: 'Kunci pengiriman tidak valid.' }
  if (!/^[0-9a-f]{64}$/.test(b.sha256)) return { ok: false, galat: 'Hash berkas tidak valid.' }
  const lama = daftar.find((k) => k.kunci === b.kunci)
  if (lama) return lama.sha256 === b.sha256 ? { ok: true, kiriman: lama, daftar, baru: false } : { ok: false, galat: 'Kunci pengiriman sudah dipakai untuk berkas lain.' }
  const a = aturan.ujianDaring
  if (!a.tipe.includes(b.tipe)) return { ok: false, galat: 'Jenis berkas tidak diterima.' }
  if (b.ukuran <= 0 || b.ukuran > a.maksMB * 1024 * 1024) return { ok: false, galat: `Ukuran berkas harus 1 byte–${a.maksMB} MB.` }
  const f = fase(s, nowServer, aturan).fase
  if (f === 'BELUM') return { ok: false, galat: 'Ujian belum dimulai.' }
  if (f === 'DITUTUP') return { ok: false, galat: 'Waktu pengiriman sudah ditutup.' }
  const kiriman: KirimanJawaban = { ...b, versi: daftar.length + 1, diterima: new Date(nowServer).toISOString() }
  return { ok: true, kiriman, daftar: [...daftar, kiriman], baru: true }
}

/** Soal hanya disertakan bila ujian sudah dimulai menurut jam server. */
export const sesiUntukKlien = (s: SesiDaring, nowServer: number, aturan: AturanDaring): SesiDaring =>
  fase(s, nowServer, aturan).fase === 'BELUM' ? { ...s, soal: undefined } : s
