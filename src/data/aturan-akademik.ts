import type { AturanAkademik } from '../lib/akademik/types'

// ATURAN AKADEMIK — satu-satunya tempat angka & syarat ujian/skripsi.
// SEMUA nilai di bawah adalah CONTOH (belum diverifikasi): `sumber.dokumen = null` → TODO(BAAK).
// Aplikasi menampilkan label "aturan contoh" selama `diverifikasi` masih null.
// Ganti nilai dari dokumen resmi (pedoman akademik, pedoman skripsi prodi, SK UTS/UAS) dan isi `sumber`.
// Lihat docs/ATURAN-UJIAN-DAN-SKRIPSI.md untuk pertanyaan terbuka.

const SUMBER_CONTOH = { dokumen: null, diverifikasi: null, catatan: 'TODO(BAAK): nilai contoh, belum ada dokumen resmi' }

const TATA_TERTIB_UJIAN = ['Hadir 15 menit sebelum ujian dimulai.', 'Tunjukkan kartu ujian (QR) kepada pengawas.', 'HP dimatikan dan disimpan di tas.', 'Berpakaian rapi dan bersepatu.']

const BERKAS_DASAR = [
  { id: 'naskah', nama: 'Naskah (PDF)', tipe: ['application/pdf'], maksMB: 20, wajib: true, contoh: 'Naskah lengkap sesuai format prodi' },
  { id: 'lembar-persetujuan', nama: 'Lembar persetujuan pembimbing', tipe: ['application/pdf', 'image/jpeg', 'image/png'], maksMB: 5, wajib: true },
  { id: 'kartu-bimbingan', nama: 'Kartu bimbingan', tipe: ['application/pdf'], maksMB: 5, wajib: true, contoh: 'Ekspor dari menu Bimbingan' },
]

const UJIAN_AKHIR_DASAR = {
  aktif: true,
  butuhPersetujuanPembimbing: true,
  butuhLunas: true,
  biaya: null,
  jumlahPenguji: 2,
  pengujiBolehPembimbing: false,
  durasiMenit: 90,
  jendelaPenilaian: { sebelumMenit: 15, sesudahMenit: 180 },
  batasBatalHari: 3,
  tataTertib: ['Hadir 30 menit sebelum jadwal.', 'Bawa naskah versi terakhir yang diserahkan.', 'Siapkan presentasi maksimal 15 menit.'],
}

export const ATURAN_UMUM: AturanAkademik = {
  id: 'umum-contoh',
  prodi: '*',
  sumber: SUMBER_CONTOH,
  ujianSemester: {
    minKehadiranPersen: 75,
    wajibLunas: true,
    jedaBeruntunMenit: 30,
    batasPengajuanSusulanHari: 3,
    tataTertib: {
      UTS: TATA_TERTIB_UJIAN,
      UAS: TATA_TERTIB_UJIAN,
      SUSULAN: [...TATA_TERTIB_UJIAN, 'Bawa bukti persetujuan ujian susulan.'],
      REMEDIAL: [...TATA_TERTIB_UJIAN, 'Nilai remedial mengikuti ketentuan prodi.'],
    },
  },
  skripsi: {
    minSks: 110,
    minIpk: 2.0,
    mkWajib: [{ kode: 'TIF401', nama: 'Metodologi Penelitian' }],
    maksJudulKarakter: 200,
    jumlahPilihanPembimbing: 3,
    kuotaPembimbingDefault: 10,
    jedaPengingatHari: 14,
    ambangKemiripanJudul: 0.6,
    maksDrafMB: 25,
  },
  ujianAkhir: {
    PROPOSAL: { ...UJIAN_AKHIR_DASAR, nama: 'Seminar Proposal', minBimbingan: 4, berkas: BERKAS_DASAR },
    SEMINAR_HASIL: { ...UJIAN_AKHIR_DASAR, nama: 'Seminar Hasil', minBimbingan: 6, berkas: BERKAS_DASAR },
    UAPS: {
      ...UJIAN_AKHIR_DASAR,
      nama: 'UAPS',
      keterangan: 'Arti dan aturan UAPS belum diketahui. TODO(BAAK): isi dari dokumen resmi.',
      minBimbingan: 8,
      berkas: BERKAS_DASAR,
    },
    SIDANG: {
      ...UJIAN_AKHIR_DASAR,
      nama: 'Sidang Akhir',
      minBimbingan: 8,
      jumlahPenguji: 3,
      durasiMenit: 120,
      berkas: [...BERKAS_DASAR, { id: 'bebas-plagiasi', nama: 'Surat hasil cek kemiripan', tipe: ['application/pdf'], maksMB: 5, wajib: true }],
    },
  },
  penilaian: {
    rubrik: [
      { id: 'naskah', nama: 'Kualitas naskah', bobot: 30, min: 0, max: 100 },
      { id: 'metode', nama: 'Metode & analisis', bobot: 30, min: 0, max: 100 },
      { id: 'presentasi', nama: 'Presentasi', bobot: 20, min: 0, max: 100 },
      { id: 'tanya-jawab', nama: 'Penguasaan & tanya jawab', bobot: 20, min: 0, max: 100 },
    ],
    desimal: 2,
    ambangSelisihPenguji: 15,
    hurufMutu: [
      { min: 85, huruf: 'A' },
      { min: 80, huruf: 'A-' },
      { min: 75, huruf: 'B+' },
      { min: 70, huruf: 'B' },
      { min: 65, huruf: 'B-' },
      { min: 60, huruf: 'C+' },
      { min: 55, huruf: 'C' },
      { min: 40, huruf: 'D' },
      { min: 0, huruf: 'E' },
    ],
  },
  revisi: { batasHari: 30 },
  kelulusan: {
    checklist: [
      { id: 'bebas-pustaka', nama: 'Bebas pustaka', rute: 'surat' },
      { id: 'bebas-keuangan', nama: 'Bebas keuangan', rute: 'keuangan' },
      { id: 'bebas-lab', nama: 'Bebas laboratorium', rute: 'surat' },
      { id: 'berkas-fisik', nama: 'Penyerahan berkas fisik', rute: 'surat' },
      { id: 'data-yudisium', nama: 'Data yudisium', rute: 'profil' },
      { id: 'skpi', nama: 'SKPI', rute: 'sertifikat' },
    ],
    opsiPublikasi: [
      { id: 'TERBUKA', nama: 'Terbuka di repositori' },
      { id: 'TERTAHAN', nama: 'Tertahan sementara (sesuai ketentuan)' },
      { id: 'INTERNAL', nama: 'Hanya internal kampus' },
    ],
    maksNaskahMB: 50,
  },
}

/** Daftar konfigurasi per prodi. Prodi tanpa entri khusus memakai ATURAN_UMUM. */
export const DAFTAR_ATURAN: AturanAkademik[] = [ATURAN_UMUM]
