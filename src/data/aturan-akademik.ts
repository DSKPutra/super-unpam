// Aturan akademik ujian dan skripsi sebagai DATA (T-ATURAN 1). Kode di src/lib/akademik membaca
// berkas ini; tidak ada ambang atau bobot yang ditulis di komponen.
//
// PENTING: dokumen resmi UNPAM (pedoman akademik, pedoman skripsi, SK UTS/UAS, rubrik, arti UAPS) belum
// tersedia di repo (T00). SEMUA angka di bawah adalah NILAI CONTOH: `sumber: null` dan ditandai
// TODO(BAAK). UI wajib menampilkan label "contoh" untuk syarat yang ambangnya belum diverifikasi.

import type { JenisUjian } from '../lib/akademik/types.js'

export interface Sumber {
  /** Dokumen resmi + halaman, mis. "Pedoman Akademik 2026, hlm. 12". null = belum diverifikasi. */
  sumber: string | null
  /** Tanggal diverifikasi manusia (YYYY-MM-DD). */
  dicek: string | null
}

export type DefinisiSyarat =
  | { id: 'kehadiran'; minPersen: number }
  | { id: 'keuangan' }
  | { id: 'sks'; minimal: number }
  | { id: 'ipk'; minimal: number }
  | { id: 'bimbingan'; minimal: number }
  | { id: 'persetujuan-pembimbing' }
  | { id: 'berkas'; wajib: { id: string; label: string }[] }
  | { id: 'mk-wajib'; kode: { kode: string; nama: string }[] }

export interface AturanUjian extends Sumber {
  jenis: JenisUjian
  /** Nama tampilan. "UAPS" sengaja tanpa kepanjangan: artinya belum diketahui (T00). */
  nama: string
  syarat: DefinisiSyarat[]
  /** Peringatan "ujian beruntun" bila jeda antar sesi kurang dari ini (menit). */
  jedaMinimalMenit: number
  tataTertib: string[]
  /** Batas pengajuan (hari setelah ujian) untuk susulan/remedial. */
  batasPengajuanHari?: number
  /** Lampiran bukti pengajuan (susulan/remedial): ukuran maksimal dan tipe yang diterima. */
  lampiran?: { maksMB: number; tipe: string[] }
  /** Checklist berkas pendaftaran ujian akhir. Id yang wajib harus sama dengan syarat 'berkas'. */
  berkas?: AturanBerkas[]
  /** Pembatalan/penjadwalan ulang paling lambat sekian jam sebelum ujian. */
  batasBatalJam?: number
  /** Konsekuensi pembatalan yang ditampilkan ke mahasiswa (teks resmi dari prodi). */
  konsekuensiBatal?: string
  /** Daftar yang harus dibawa saat ujian. */
  bawaan?: string[]
}

export interface AturanBerkas {
  id: string
  label: string
  tipe: string[]
  maksMB: number
  wajib: boolean
  keterangan?: string
}

export interface KriteriaRubrik {
  id: string
  label: string
  /** Persen; jumlah semua bobot harus 100. */
  bobot: number
  min: number
  maks: number
}

export interface Rubrik extends Sumber {
  jenis: JenisUjian
  kriteria: KriteriaRubrik[]
  /** Peringatan rapat kesepakatan bila selisih nilai antar penguji melebihi ini. */
  ambangSelisih: number
}

export interface HurufMutu {
  /** Nilai angka minimal (inklusif). */
  min: number
  huruf: string
}

export interface AturanProdi extends Sumber {
  /** Nama prodi persis seperti di data mahasiswa, atau '*' untuk bawaan semua prodi. */
  prodi: string
  ujian: AturanUjian[]
  rubrik: Rubrik[]
  hurufMutu: HurufMutu[]
  /** Jumlah desimal pembulatan nilai pratinjau. */
  desimal: number
  /** Maksimal karakter judul tugas akhir. */
  maksKarakterJudul: number
  /** Kuota mahasiswa bimbingan per dosen. */
  kuotaBimbingan: number
  /** Pengingat halus bila tidak ada bimbingan lebih dari ini (hari). */
  jedaBimbinganHari: number
  /** Syarat mulai mengajukan judul skripsi/TA (dievaluasi dengan evaluasiKelayakan). */
  mulaiTA: Sumber & { syarat: DefinisiSyarat[] }
  /** Untuk estimasi kapan syarat SKS terpenuhi ("±N semester lagi"). */
  perkiraanSksPerSemester: number
  /** Peringatan "judul mirip" bila skor kemiripan ≥ ini (0–1). Bukan pengganti cek plagiasi resmi. */
  ambangKemiripanJudul: number
  /** Berkas draf naskah: ukuran maksimal dan tipe yang diterima (versi draf, T04). */
  drafNaskah: { maksMB: number; tipe: string[] }
  /** Jumlah pilihan pembimbing yang diminta saat pengajuan (urut prioritas). */
  jumlahPilihanPembimbing: number
  /** Bidang/kelompok keilmuan yang bisa dipilih. Kosong = isian bebas. */
  bidangTA: string[]
}

const TODO: Sumber = { sumber: null, dicek: null } // TODO(BAAK): isi dari dokumen resmi

const LAMPIRAN_CONTOH = { maksMB: 5, tipe: ['application/pdf', 'image/jpeg', 'image/png'] }
const PDF = ['application/pdf']
const PDF_GAMBAR = ['application/pdf', 'image/jpeg', 'image/png']
const UJIAN_AKHIR_CONTOH = {
  batasBatalJam: 48,
  konsekuensiBatal: 'Contoh: pendaftaran dibatalkan dan harus diajukan ulang; jadwal berikutnya mengikuti ketersediaan slot prodi.',
  bawaan: ['Naskah cetak sesuai jumlah penguji (contoh)', 'Kartu bimbingan', 'Kartu tanda mahasiswa', 'Bahan presentasi'],
}
const TATA_TERTIB_CONTOH = ['Hadir 15 menit sebelum ujian dimulai.', 'Tunjukkan kartu ujian (QR) kepada pengawas.', 'HP dimatikan dan disimpan di tas.', 'Wajib berpakaian rapi dan bersepatu.']

/** Aturan bawaan (semua prodi). SEMUA NILAI CONTOH — TODO(BAAK). */
export const ATURAN_BAWAAN: AturanProdi = {
  prodi: '*',
  ...TODO,
  desimal: 2,
  maksKarakterJudul: 200,
  kuotaBimbingan: 10,
  jedaBimbinganHari: 21,
  mulaiTA: { ...TODO, syarat: [{ id: 'sks', minimal: 110 }, { id: 'ipk', minimal: 2 }, { id: 'keuangan' }] },
  perkiraanSksPerSemester: 20,
  ambangKemiripanJudul: 0.5,
  jumlahPilihanPembimbing: 3,
  drafNaskah: { maksMB: 20, tipe: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  bidangTA: ['Rekayasa Perangkat Lunak', 'Jaringan & Keamanan', 'Kecerdasan Buatan & Data', 'Sistem Informasi', 'Multimedia & Gim'],
  hurufMutu: [
    { min: 85, huruf: 'A' },
    { min: 80, huruf: 'A-' },
    { min: 75, huruf: 'B+' },
    { min: 70, huruf: 'B' },
    { min: 65, huruf: 'B-' },
    { min: 60, huruf: 'C+' },
    { min: 55, huruf: 'C' },
    { min: 45, huruf: 'D' },
    { min: 0, huruf: 'E' },
  ],
  ujian: [
    { jenis: 'UTS', nama: 'UTS', ...TODO, jedaMinimalMenit: 30, tataTertib: TATA_TERTIB_CONTOH, syarat: [{ id: 'kehadiran', minPersen: 75 }, { id: 'keuangan' }] },
    { jenis: 'UAS', nama: 'UAS', ...TODO, jedaMinimalMenit: 30, tataTertib: TATA_TERTIB_CONTOH, syarat: [{ id: 'kehadiran', minPersen: 75 }, { id: 'keuangan' }] },
    { jenis: 'SUSULAN', nama: 'Ujian Susulan', ...TODO, jedaMinimalMenit: 30, tataTertib: TATA_TERTIB_CONTOH, batasPengajuanHari: 7, lampiran: LAMPIRAN_CONTOH, syarat: [{ id: 'keuangan' }] },
    { jenis: 'REMEDIAL', nama: 'Remedial', ...TODO, jedaMinimalMenit: 30, tataTertib: TATA_TERTIB_CONTOH, batasPengajuanHari: 7, lampiran: LAMPIRAN_CONTOH, syarat: [{ id: 'keuangan' }] },
    {
      jenis: 'PROPOSAL', nama: 'Seminar Proposal', ...TODO, jedaMinimalMenit: 60, tataTertib: [], ...UJIAN_AKHIR_CONTOH,
      syarat: [{ id: 'bimbingan', minimal: 4 }, { id: 'persetujuan-pembimbing' }, { id: 'keuangan' }, { id: 'berkas', wajib: [{ id: 'naskah-proposal', label: 'Naskah proposal' }, { id: 'lembar-persetujuan', label: 'Lembar persetujuan pembimbing' }] }],
      berkas: [
        { id: 'naskah-proposal', label: 'Naskah proposal', tipe: PDF, maksMB: 10, wajib: true, keterangan: 'Bab 1–3 dan daftar pustaka (contoh).' },
        { id: 'lembar-persetujuan', label: 'Lembar persetujuan pembimbing', tipe: PDF_GAMBAR, maksMB: 2, wajib: true },
        { id: 'kartu-bimbingan', label: 'Kartu bimbingan', tipe: PDF, maksMB: 2, wajib: false, keterangan: 'Bisa dicetak dari logbook.' },
      ],
    },
    {
      jenis: 'SEMINAR_HASIL', nama: 'Seminar Hasil', ...TODO, jedaMinimalMenit: 60, tataTertib: [], ...UJIAN_AKHIR_CONTOH,
      syarat: [{ id: 'bimbingan', minimal: 8 }, { id: 'persetujuan-pembimbing' }, { id: 'keuangan' }, { id: 'berkas', wajib: [{ id: 'naskah-hasil', label: 'Naskah hasil penelitian' }] }],
      berkas: [{ id: 'naskah-hasil', label: 'Naskah hasil penelitian', tipe: PDF, maksMB: 20, wajib: true }],
    },
    // UAPS: arti dan aturannya belum diketahui (T00). Nama tampil apa adanya; syarat contoh.
    {
      jenis: 'UAPS', nama: 'UAPS', ...TODO, jedaMinimalMenit: 60, tataTertib: [], ...UJIAN_AKHIR_CONTOH,
      syarat: [{ id: 'bimbingan', minimal: 8 }, { id: 'persetujuan-pembimbing' }, { id: 'keuangan' }],
    },
    {
      jenis: 'SIDANG', nama: 'Sidang Akhir', ...TODO, jedaMinimalMenit: 60, tataTertib: [], ...UJIAN_AKHIR_CONTOH,
      berkas: [
        { id: 'naskah-final', label: 'Naskah lengkap', tipe: PDF, maksMB: 20, wajib: true },
        { id: 'bebas-pustaka', label: 'Surat bebas pustaka', tipe: PDF_GAMBAR, maksMB: 2, wajib: true },
      ],
      syarat: [
        { id: 'sks', minimal: 138 },
        { id: 'ipk', minimal: 2 },
        { id: 'bimbingan', minimal: 8 },
        { id: 'persetujuan-pembimbing' },
        { id: 'keuangan' },
        { id: 'berkas', wajib: [{ id: 'naskah-final', label: 'Naskah lengkap' }, { id: 'bebas-pustaka', label: 'Surat bebas pustaka' }] },
      ],
    },
  ],
  rubrik: [
    {
      jenis: 'SIDANG', ...TODO, ambangSelisih: 15,
      kriteria: [
        { id: 'naskah', label: 'Kualitas naskah', bobot: 30, min: 0, maks: 100 },
        { id: 'presentasi', label: 'Presentasi', bobot: 20, min: 0, maks: 100 },
        { id: 'penguasaan', label: 'Penguasaan materi', bobot: 50, min: 0, maks: 100 },
      ],
    },
  ],
}

/** Aturan khusus per prodi menimpa bawaan per field. Belum ada yang terverifikasi. */
export const ATURAN_PRODI: AturanProdi[] = [ATURAN_BAWAAN]
